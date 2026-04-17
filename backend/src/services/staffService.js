import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/roles.js";
import { Staff } from "../models/Staff.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeStaff } from "../utils/sanitizeStaff.js";

const userProjection = "name email phone role profilePhoto isActive lastLogin createdAt updatedAt";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeSortStage(sortBy = "createdAt", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    name: "user.name",
    email: "user.email",
    staffId: "staffId",
    department: "department",
    designation: "designation",
    joiningDate: "joiningDate",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  };

  const field = mappedPath[sortBy] || "createdAt";
  return { [field]: direction, _id: 1 };
}

function buildStaffFilters(query) {
  const match = {};

  if (query.department) {
    match.department = query.department;
  }

  if (query.designation) {
    match.designation = query.designation;
  }

  if (typeof query.isActive === "boolean") {
    match.isActive = query.isActive;
  }

  return match;
}

async function loadStaffWithUserById(staffRecordId) {
  const staff = await Staff.findById(staffRecordId).populate("userId", userProjection);
  if (!staff) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Staff not found");
  }

  return staff;
}

async function loadMyStaffProfile(userId) {
  const staff = await Staff.findOne({ userId }).populate("userId", userProjection);
  if (!staff) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Staff profile not found");
  }

  return staff;
}

function mapDuplicateKeyError(error) {
  if (error?.code !== 11000) {
    return null;
  }

  const duplicatedField = Object.keys(error.keyPattern || {})[0];
  if (!duplicatedField) {
    return new ApiError(StatusCodes.CONFLICT, "Duplicate value is not allowed");
  }

  if (duplicatedField === "email") {
    return new ApiError(StatusCodes.CONFLICT, "Email already in use");
  }

  if (duplicatedField === "staffId") {
    return new ApiError(StatusCodes.CONFLICT, "Staff ID already in use");
  }

  return new ApiError(StatusCodes.CONFLICT, `${duplicatedField} already exists`);
}

export const staffService = {
  async createStaff(payload, actor = null) {
    const existingUser = await User.findOne({ email: payload.email }).lean();
    if (existingUser) {
      throw new ApiError(StatusCodes.CONFLICT, "Email already in use");
    }

    const user = await User.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      profilePhoto: payload.profilePhoto || "",
      role: USER_ROLES.STAFF,
      isActive: payload.isActive ?? true,
    });

    try {
      const staff = await Staff.create({
        userId: user._id,
        staffId: normalizeString(payload.staffId),
        department: payload.department,
        designation: payload.designation,
        profilePhoto: payload.profilePhoto || "",
        joiningDate: payload.joiningDate,
        isActive: payload.isActive ?? true,
      });

      const populated = await Staff.findById(staff._id).populate("userId", userProjection);
      try {
        await notificationService.createNotification({
          recipientUserId: user._id,
          actorUserId: actor?.id || null,
          type: "staff_profile_created",
          title: "Staff Account Created",
          message: "Your staff profile was created by the provost office.",
          link: "/staff/profile",
          entityType: "Staff",
          entityId: staff._id.toString(),
        });
      } catch {
        // Notification failures must not block account provisioning.
      }
      return sanitizeStaff(populated);
    } catch (error) {
      await User.findByIdAndDelete(user._id);
      const duplicateKeyError = mapDuplicateKeyError(error);
      if (duplicateKeyError) {
        throw duplicateKeyError;
      }

      throw error;
    }
  },

  async listStaff(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sortStage = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = buildStaffFilters(query);
    const searchRegex = query.search ? new RegExp(escapeRegex(query.search), "i") : null;

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $match: {
          ...filters,
          "user.role": USER_ROLES.STAFF,
        },
      },
    ];

    if (searchRegex) {
      pipeline.push({
        $match: {
          $or: [{ "user.name": searchRegex }, { "user.email": searchRegex }, { staffId: searchRegex }],
        },
      });
    }

    pipeline.push({
      $facet: {
        items: [
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              userId: {
                _id: "$user._id",
                name: "$user.name",
                email: "$user.email",
                phone: "$user.phone",
                profilePhoto: "$user.profilePhoto",
                role: "$user.role",
                isActive: "$user.isActive",
                lastLogin: "$user.lastLogin",
                createdAt: "$user.createdAt",
                updatedAt: "$user.updatedAt",
              },
              staffId: 1,
              department: 1,
              designation: 1,
              profilePhoto: 1,
              joiningDate: 1,
              isActive: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
        meta: [{ $count: "total" }],
        summary: [
          {
            $group: {
              _id: null,
              totalStaff: { $sum: 1 },
              activeStaff: {
                $sum: {
                  $cond: [{ $eq: ["$isActive", true] }, 1, 0],
                },
              },
              inactiveStaff: {
                $sum: {
                  $cond: [{ $eq: ["$isActive", false] }, 1, 0],
                },
              },
            },
          },
        ],
        departmentBreakdown: [
          {
            $group: {
              _id: "$department",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 8 },
        ],
      },
    });

    const [result] = await Staff.aggregate(pipeline);
    const total = result?.meta?.[0]?.total || 0;
    const summary = result?.summary?.[0] || {
      totalStaff: 0,
      activeStaff: 0,
      inactiveStaff: 0,
    };

    return {
      items: (result?.items || []).map((item) => sanitizeStaff(item)),
      summary: {
        totalStaff: summary.totalStaff,
        activeStaff: summary.activeStaff,
        inactiveStaff: summary.inactiveStaff,
        byDepartment: (result?.departmentBreakdown || []).map((entry) => ({
          department: entry._id,
          count: entry.count,
        })),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "createdAt",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getStaffById(staffRecordId) {
    const staff = await loadStaffWithUserById(staffRecordId);
    return sanitizeStaff(staff);
  },

  async updateStaffById(staffRecordId, payload, actor = null) {
    const staff = await loadStaffWithUserById(staffRecordId);
    const user = await User.findById(staff.userId._id);
    const previousIsActive = staff.isActive;

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Linked user account not found");
    }

    if (payload.email && payload.email !== user.email) {
      const existingUser = await User.findOne({
        email: payload.email,
        _id: { $ne: user._id },
      }).lean();

      if (existingUser) {
        throw new ApiError(StatusCodes.CONFLICT, "Email already in use");
      }
    }

    if (payload.name !== undefined) user.name = payload.name;
    if (payload.email !== undefined) user.email = payload.email;
    if (payload.phone !== undefined) user.phone = payload.phone;
    if (payload.profilePhoto !== undefined) {
      user.profilePhoto = payload.profilePhoto;
      staff.profilePhoto = payload.profilePhoto;
    }

    if (payload.staffId !== undefined) staff.staffId = normalizeString(payload.staffId);
    if (payload.department !== undefined) staff.department = payload.department;
    if (payload.designation !== undefined) staff.designation = payload.designation;
    if (payload.joiningDate !== undefined) staff.joiningDate = payload.joiningDate;

    if (payload.isActive !== undefined) {
      user.isActive = payload.isActive;
      staff.isActive = payload.isActive;
    }

    try {
      await Promise.all([user.save(), staff.save()]);
    } catch (error) {
      const duplicateKeyError = mapDuplicateKeyError(error);
      if (duplicateKeyError) {
        throw duplicateKeyError;
      }

      throw error;
    }

    const refreshed = await Staff.findById(staff._id).populate("userId", userProjection);
    if (payload.isActive !== undefined && previousIsActive !== payload.isActive) {
      try {
        await notificationService.createNotification({
          recipientUserId: user._id,
          actorUserId: actor?.id || null,
          type: payload.isActive ? "staff_account_activated" : "staff_account_deactivated",
          title: payload.isActive ? "Staff Account Activated" : "Staff Account Deactivated",
          message: payload.isActive
            ? "Your staff account has been reactivated."
            : "Your staff account has been deactivated. Contact the provost office for details.",
          link: "/staff/profile",
          entityType: "Staff",
          entityId: staff._id.toString(),
        });
      } catch {
        // Notification failures must not block profile updates.
      }
    }
    return sanitizeStaff(refreshed);
  },

  async updateStaffStatus(staffRecordId, isActive, actor = null) {
    return this.updateStaffById(staffRecordId, { isActive }, actor);
  },

  async getMyStaffProfile(actor) {
    const staff = await loadMyStaffProfile(actor.id);
    return sanitizeStaff(staff);
  },

  async updateMyStaffProfile(actor, payload) {
    const staff = await loadMyStaffProfile(actor.id);
    const user = await User.findById(actor.id);

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User account not found");
    }

    if (payload.name !== undefined) {
      user.name = payload.name;
    }

    if (payload.phone !== undefined) {
      user.phone = payload.phone;
    }

    if (payload.profilePhoto !== undefined) {
      user.profilePhoto = payload.profilePhoto;
      staff.profilePhoto = payload.profilePhoto;
    }

    await Promise.all([user.save(), staff.save()]);

    const refreshed = await Staff.findById(staff._id).populate("userId", userProjection);
    return sanitizeStaff(refreshed);
  },
};
