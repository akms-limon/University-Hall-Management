import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/roles.js";
import { Student, STUDENT_ALLOCATION_STATUS } from "../models/Student.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeStudent } from "../utils/sanitizeStudent.js";

const userProjection = "name email phone role profilePhoto isActive lastLogin createdAt updatedAt";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRegistrationNumber(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeEmergencyContact(update, current = {}) {
  if (!update) {
    return {
      name: current.name || "",
      phone: current.phone || "",
      relation: current.relation || "",
    };
  }

  return {
    name: update.name ?? current.name ?? "",
    phone: update.phone ?? current.phone ?? "",
    relation: update.relation ?? current.relation ?? "",
  };
}

function normalizeSortStage(sortBy = "createdAt", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    name: "user.name",
    email: "user.email",
    registrationNumber: "registrationNumber",
    department: "department",
    semester: "semester",
    allocationStatus: "allocationStatus",
    balance: "balance",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  };

  const field = mappedPath[sortBy] || "createdAt";
  return { [field]: direction, _id: 1 };
}

function buildStudentFilters(query) {
  const match = {};

  if (query.department) {
    match.department = query.department;
  }

  if (typeof query.semester === "number") {
    match.semester = query.semester;
  }

  if (query.allocationStatus) {
    match.allocationStatus = query.allocationStatus;
  }

  if (typeof query.isActive === "boolean") {
    match.isActive = query.isActive;
  }

  return match;
}

async function loadStudentWithUserById(studentId) {
  const student = await Student.findById(studentId)
    .populate("userId", userProjection)
    .populate("currentRoom", "roomNumber floor wing");
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Student not found");
  }

  return student;
}

async function ensureStudentProfile(userId) {
  let student = await Student.findOne({ userId })
    .populate("userId", userProjection)
    .populate("currentRoom", "roomNumber floor wing");
  if (student) {
    return student;
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User account not found");
  }

  student = await Student.create({
    userId: user._id,
    profilePhoto: user.profilePhoto || "",
  });

  return Student.findById(student._id)
    .populate("userId", userProjection)
    .populate("currentRoom", "roomNumber floor wing");
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

  if (duplicatedField === "registrationNumber") {
    return new ApiError(StatusCodes.CONFLICT, "Registration number already in use");
  }

  return new ApiError(StatusCodes.CONFLICT, `${duplicatedField} already exists`);
}

export const studentService = {
  async createStudent(payload, actor = null) {
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
      role: USER_ROLES.STUDENT,
      isActive: payload.isActive ?? true,
    });

    try {
      const student = await Student.create({
        userId: user._id,
        registrationNumber: normalizeRegistrationNumber(payload.registrationNumber),
        department: payload.department,
        semester: payload.semester,
        profilePhoto: payload.profilePhoto || "",
        currentRoom: payload.currentRoom ?? null,
        balance: payload.balance ?? 0,
        emergencyContact: normalizeEmergencyContact(payload.emergencyContact),
        allocationStatus: payload.allocationStatus ?? STUDENT_ALLOCATION_STATUS.NONE,
        isActive: payload.isActive ?? true,
      });

      const populated = await Student.findById(student._id)
        .populate("userId", userProjection)
        .populate("currentRoom", "roomNumber floor wing");
      try {
        await notificationService.createNotification({
          recipientUserId: user._id,
          actorUserId: actor?.id || null,
          type: "student_profile_created",
          title: "Student Account Created",
          message: "Your student profile was created by the provost office.",
          link: "/student/profile",
          entityType: "Student",
          entityId: student._id.toString(),
        });
      } catch {
        // Notification failures must not block account provisioning.
      }
      return sanitizeStudent(populated);
    } catch (error) {
      await User.findByIdAndDelete(user._id);
      const duplicateKeyError = mapDuplicateKeyError(error);
      if (duplicateKeyError) {
        throw duplicateKeyError;
      }
      throw error;
    }
  },

  async listStudents(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sortStage = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = buildStudentFilters(query);
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
        $lookup: {
          from: "rooms",
          localField: "currentRoom",
          foreignField: "_id",
          as: "currentRoomRef",
        },
      },
      {
        $unwind: {
          path: "$currentRoomRef",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          ...filters,
          "user.role": USER_ROLES.STUDENT,
        },
      },
    ];

    if (searchRegex) {
      pipeline.push({
        $match: {
          $or: [
            { "user.name": searchRegex },
            { "user.email": searchRegex },
            { registrationNumber: searchRegex },
          ],
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
              registrationNumber: 1,
              department: 1,
              semester: 1,
              profilePhoto: 1,
              currentRoom: "$currentRoomRef.roomNumber",
              balance: 1,
              emergencyContact: 1,
              allocationStatus: 1,
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
              totalStudents: { $sum: 1 },
              activeStudents: {
                $sum: {
                  $cond: [{ $eq: ["$isActive", true] }, 1, 0],
                },
              },
              pendingAllocation: {
                $sum: {
                  $cond: [{ $eq: ["$allocationStatus", STUDENT_ALLOCATION_STATUS.PENDING] }, 1, 0],
                },
              },
              allocatedStudents: {
                $sum: {
                  $cond: [{ $eq: ["$allocationStatus", STUDENT_ALLOCATION_STATUS.ALLOCATED] }, 1, 0],
                },
              },
            },
          },
        ],
      },
    });

    const [result] = await Student.aggregate(pipeline);
    const total = result?.meta?.[0]?.total || 0;
    const summary = result?.summary?.[0] || {
      totalStudents: 0,
      activeStudents: 0,
      pendingAllocation: 0,
      allocatedStudents: 0,
    };

    return {
      items: (result?.items || []).map((item) => sanitizeStudent(item)),
      summary: {
        totalStudents: summary.totalStudents,
        activeStudents: summary.activeStudents,
        pendingAllocation: summary.pendingAllocation,
        allocatedStudents: summary.allocatedStudents,
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

  async getStudentById(studentId) {
    const student = await loadStudentWithUserById(studentId);
    return sanitizeStudent(student);
  },

  async updateStudentById(studentId, payload, actor = null) {
    const student = await loadStudentWithUserById(studentId);
    const user = await User.findById(student.userId._id);
    const previousIsActive = student.isActive;

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
      student.profilePhoto = payload.profilePhoto;
    }

    if (payload.registrationNumber !== undefined) {
      student.registrationNumber = normalizeRegistrationNumber(payload.registrationNumber);
    }
    if (payload.department !== undefined) student.department = payload.department;
    if (payload.semester !== undefined) student.semester = payload.semester;
    if (payload.currentRoom !== undefined) student.currentRoom = payload.currentRoom;
    if (payload.balance !== undefined) student.balance = payload.balance;
    if (payload.allocationStatus !== undefined) student.allocationStatus = payload.allocationStatus;
    if (payload.emergencyContact !== undefined) {
      student.emergencyContact = normalizeEmergencyContact(payload.emergencyContact, student.emergencyContact);
    }

    if (payload.isActive !== undefined) {
      user.isActive = payload.isActive;
      student.isActive = payload.isActive;
    }

    try {
      await Promise.all([user.save(), student.save()]);
    } catch (error) {
      const duplicateKeyError = mapDuplicateKeyError(error);
      if (duplicateKeyError) {
        throw duplicateKeyError;
      }
      throw error;
    }

    const refreshed = await Student.findById(student._id)
      .populate("userId", userProjection)
      .populate("currentRoom", "roomNumber floor wing");
    if (payload.isActive !== undefined && previousIsActive !== payload.isActive) {
      try {
        await notificationService.createNotification({
          recipientUserId: user._id,
          actorUserId: actor?.id || null,
          type: payload.isActive ? "student_account_activated" : "student_account_deactivated",
          title: payload.isActive ? "Student Account Activated" : "Student Account Deactivated",
          message: payload.isActive
            ? "Your student account has been reactivated."
            : "Your student account has been deactivated. Contact the provost office for help.",
          link: "/student/profile",
          entityType: "Student",
          entityId: student._id.toString(),
        });
      } catch {
        // Notification failures must not block profile updates.
      }
    }
    return sanitizeStudent(refreshed);
  },

  async updateStudentStatus(studentId, isActive, actor = null) {
    return this.updateStudentById(studentId, { isActive }, actor);
  },

  async getMyStudentProfile(actor) {
    const student = await ensureStudentProfile(actor.id);
    return sanitizeStudent(student);
  },

  async updateMyStudentProfile(actor, payload) {
    const student = await ensureStudentProfile(actor.id);
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
      student.profilePhoto = payload.profilePhoto;
    }

    if (payload.semester !== undefined) {
      student.semester = payload.semester;
    }

    if (payload.emergencyContact !== undefined) {
      student.emergencyContact = normalizeEmergencyContact(payload.emergencyContact, student.emergencyContact);
    }

    await Promise.all([user.save(), student.save()]);

    const refreshed = await Student.findById(student._id)
      .populate("userId", userProjection)
      .populate("currentRoom", "roomNumber floor wing");
    return sanitizeStudent(refreshed);
  },
};
