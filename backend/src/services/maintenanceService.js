import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.js";
import { Maintenance, MAINTENANCE_STATUS } from "../models/Maintenance.js";
import { Room } from "../models/Room.js";
import { Staff } from "../models/Staff.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeMaintenance } from "../utils/sanitizeMaintenance.js";

const userProjection = "name email phone role profilePhoto isActive";
const staffUserProjection = "name email phone role profilePhoto isActive";
const roomProjection = "roomNumber floor wing status isActive";

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
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    status: "status",
    severity: "severity",
    category: "category",
  };

  const field = mappedPath[sortBy] || "createdAt";
  return { [field]: direction, _id: 1 };
}

function normalizeDateBoundary(value, boundary = "start") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (boundary === "end") {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

function normalizePhotos(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => normalizeString(value)).filter(Boolean);
}

function normalizeMaterials(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((entry) => ({
      name: normalizeString(entry?.name),
      quantity: Number(entry?.quantity) || 0,
      cost: Number(entry?.cost) || 0,
    }))
    .filter((entry) => entry.name.length > 0);
}

function buildStatusSummary(entries) {
  const summary = {
    total: 0,
    reported: 0,
    inspected: 0,
    inProgress: 0,
    completed: 0,
    closed: 0,
  };

  entries.forEach((entry) => {
    if (entry._id === MAINTENANCE_STATUS.REPORTED) summary.reported = entry.count;
    if (entry._id === MAINTENANCE_STATUS.INSPECTED) summary.inspected = entry.count;
    if (entry._id === MAINTENANCE_STATUS.IN_PROGRESS) summary.inProgress = entry.count;
    if (entry._id === MAINTENANCE_STATUS.COMPLETED) summary.completed = entry.count;
    if (entry._id === MAINTENANCE_STATUS.CLOSED) summary.closed = entry.count;
  });

  summary.total =
    summary.reported +
    summary.inspected +
    summary.inProgress +
    summary.completed +
    summary.closed;

  return summary;
}

function applyCompletionDate(record) {
  if (
    (record.status === MAINTENANCE_STATUS.COMPLETED ||
      record.status === MAINTENANCE_STATUS.CLOSED) &&
    !record.completionDate
  ) {
    record.completionDate = new Date();
  }

  if (
    record.status !== MAINTENANCE_STATUS.COMPLETED &&
    record.status !== MAINTENANCE_STATUS.CLOSED
  ) {
    record.completionDate = null;
  }
}

async function ensureStudentActor(userId) {
  const user = await User.findById(userId).select("_id role name").lean();
  if (!user || user.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Student profile not found");
  }

  return user;
}

async function ensureStaffProfile(userId) {
  const staff = await Staff.findOne({ userId }).populate("userId", staffUserProjection);
  if (!staff) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Staff profile not found");
  }

  return staff;
}

async function ensureRoomExists(roomId) {
  const room = await Room.findById(roomId).select(roomProjection);
  if (!room || !room.isActive) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Room not found");
  }

  return room;
}

async function populateMaintenanceById(maintenanceId) {
  const record = await Maintenance.findById(maintenanceId)
    .populate("room", roomProjection)
    .populate("reportedBy", userProjection)
    .populate({
      path: "assignedTo",
      populate: {
        path: "userId",
        select: staffUserProjection,
      },
    });

  if (!record) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Maintenance request not found");
  }

  return record;
}

function ensureOwnership(record, userId) {
  if (record.reportedBy?._id?.toString() !== userId.toString()) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Maintenance request not found");
  }
}

function ensureAssignedToStaff(record, staffId) {
  if (
    !record.assignedTo?._id ||
    record.assignedTo._id.toString() !== staffId.toString()
  ) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Maintenance request not found");
  }
}

async function resolveSearchUserIds(searchRegex) {
  const users = await User.find({
    role: USER_ROLES.STUDENT,
    $or: [{ name: searchRegex }, { email: searchRegex }],
  })
    .select("_id")
    .lean();

  return users.map((entry) => entry._id);
}

async function resolveSearchRoomIds(searchRegex) {
  const rooms = await Room.find({ roomNumber: searchRegex })
    .select("_id")
    .lean();

  return rooms.map((entry) => entry._id);
}

export const maintenanceService = {
  async createMyMaintenance(actor, payload) {
    const studentUser = await ensureStudentActor(actor.id);
    await ensureRoomExists(payload.room);

    const record = await Maintenance.create({
      room: payload.room,
      issue: normalizeString(payload.issue),
      description: normalizeString(payload.description),
      category: payload.category,
      severity: payload.severity,
      reportedBy: actor.id,
      beforePhotos: normalizePhotos(payload.beforePhotos),
      status: MAINTENANCE_STATUS.REPORTED,
    });

    await notificationService.notifyRole(USER_ROLES.PROVOST, {
      actorUserId: actor.id,
      type: "maintenance_submitted",
      title: "New Maintenance Request",
      message: `${studentUser.name || "A student"} submitted a maintenance request: ${record.issue}.`,
      link: `/provost/maintenance/${record._id}`,
      entityType: "Maintenance",
      entityId: record._id.toString(),
    });

    const populated = await populateMaintenanceById(record._id);
    return sanitizeMaintenance(populated);
  },

  async listMyMaintenance(actor, query) {
    await ensureStudentActor(actor.id);
    const actorObjectId = new mongoose.Types.ObjectId(actor.id);

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);

    const filters = {
      reportedBy: actorObjectId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
    };

    const [items, total, grouped] = await Promise.all([
      Maintenance.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("room", roomProjection)
        .populate("reportedBy", userProjection)
        .populate({
          path: "assignedTo",
          populate: { path: "userId", select: staffUserProjection },
        }),
      Maintenance.countDocuments(filters),
      Maintenance.aggregate([
        { $match: filters },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      items: items.map((item) => sanitizeMaintenance(item)),
      summary: buildStatusSummary(grouped),
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

  async getMyMaintenanceById(actor, maintenanceId) {
    await ensureStudentActor(actor.id);
    const record = await populateMaintenanceById(maintenanceId);
    ensureOwnership(record, actor.id);
    return sanitizeMaintenance(record);
  },

  async listAssignedMaintenance(actor, query) {
    const staff = await ensureStaffProfile(actor.id);

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {
      assignedTo: staff._id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
    };

    const [items, total, grouped] = await Promise.all([
      Maintenance.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("room", roomProjection)
        .populate("reportedBy", userProjection)
        .populate({
          path: "assignedTo",
          populate: { path: "userId", select: staffUserProjection },
        }),
      Maintenance.countDocuments(filters),
      Maintenance.aggregate([
        { $match: { assignedTo: staff._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      items: items.map((item) => sanitizeMaintenance(item)),
      summary: buildStatusSummary(grouped),
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

  async getAssignedMaintenanceById(actor, maintenanceId) {
    const staff = await ensureStaffProfile(actor.id);
    const record = await populateMaintenanceById(maintenanceId);
    ensureAssignedToStaff(record, staff._id);
    return sanitizeMaintenance(record);
  },

  async updateAssignedMaintenance(actor, maintenanceId, payload) {
    const staff = await ensureStaffProfile(actor.id);
    const record = await populateMaintenanceById(maintenanceId);
    ensureAssignedToStaff(record, staff._id);

    const previousStatus = record.status;

    if (payload.status) {
      record.status = payload.status;
      applyCompletionDate(record);
    }

    if (payload.workLog !== undefined) {
      record.workLog = normalizeString(payload.workLog);
    }

    if (payload.estimatedCost !== undefined) {
      record.estimatedCost = Number(payload.estimatedCost);
    }

    if (payload.actualCost !== undefined) {
      record.actualCost = Number(payload.actualCost);
    }

    if (Array.isArray(payload.materialUsed)) {
      record.materialUsed = normalizeMaterials(payload.materialUsed);
    }

    if (Array.isArray(payload.beforePhotos)) {
      record.beforePhotos = normalizePhotos(payload.beforePhotos);
    }

    if (Array.isArray(payload.afterPhotos)) {
      record.afterPhotos = normalizePhotos(payload.afterPhotos);
    }

    if (payload.invoiceDocument !== undefined) {
      const invoiceDocument = normalizeString(payload.invoiceDocument);
      record.invoiceDocument = invoiceDocument || null;
    }

    await record.save();

    const statusChanged = previousStatus !== record.status;
    const isCompleted =
      record.status === MAINTENANCE_STATUS.COMPLETED ||
      record.status === MAINTENANCE_STATUS.CLOSED;

    if (statusChanged || isCompleted) {
      await notificationService.createNotification({
        recipientUserId: record.reportedBy?._id || record.reportedBy,
        actorUserId: actor.id,
        type: isCompleted ? "maintenance_completed" : "maintenance_status_updated",
        title: isCompleted ? "Maintenance Completed" : "Maintenance Request Updated",
        message: isCompleted
          ? `Your maintenance request "${record.issue}" has been completed.`
          : `Your maintenance request status changed from ${previousStatus} to ${record.status}.`,
        link: `/student/maintenance-requests/${record._id}`,
        entityType: "Maintenance",
        entityId: record._id.toString(),
      });
    }

    const refreshed = await populateMaintenanceById(record._id);
    return sanitizeMaintenance(refreshed);
  },

  async listMaintenance(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {};

    if (query.category) filters.category = query.category;
    if (query.severity) filters.severity = query.severity;
    if (query.status) filters.status = query.status;
    if (query.assignedTo) filters.assignedTo = query.assignedTo;
    if (typeof query.isAssigned === "boolean") {
      filters.assignedTo = query.isAssigned ? { $ne: null } : null;
    }

    if (query.startDate || query.endDate) {
      filters.createdAt = {};
      if (query.startDate) {
        const startDate = normalizeDateBoundary(query.startDate, "start");
        if (startDate) {
          filters.createdAt.$gte = startDate;
        }
      }
      if (query.endDate) {
        const endDate = normalizeDateBoundary(query.endDate, "end");
        if (endDate) {
          filters.createdAt.$lte = endDate;
        }
      }
      if (!Object.keys(filters.createdAt).length) {
        delete filters.createdAt;
      }
    }

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      const [userIds, roomIds] = await Promise.all([
        resolveSearchUserIds(searchRegex),
        resolveSearchRoomIds(searchRegex),
      ]);

      filters.$or = [{ issue: searchRegex }];
      if (userIds.length) {
        filters.$or.push({ reportedBy: { $in: userIds } });
      }
      if (roomIds.length) {
        filters.$or.push({ room: { $in: roomIds } });
      }
    }

    const [items, total, grouped] = await Promise.all([
      Maintenance.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("room", roomProjection)
        .populate("reportedBy", userProjection)
        .populate({
          path: "assignedTo",
          populate: { path: "userId", select: staffUserProjection },
        }),
      Maintenance.countDocuments(filters),
      Maintenance.aggregate([
        { $match: filters },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const summary = buildStatusSummary(grouped);
    summary.total = total;

    return {
      items: items.map((item) => sanitizeMaintenance(item)),
      summary,
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

  async getMaintenanceById(maintenanceId) {
    const record = await populateMaintenanceById(maintenanceId);
    return sanitizeMaintenance(record);
  },

  async assignMaintenance(maintenanceId, actor, payload) {
    const record = await populateMaintenanceById(maintenanceId);
    const staff = await Staff.findById(payload.staffId).populate("userId", staffUserProjection);

    if (!staff) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Assigned staff not found");
    }

    if (!staff.isActive || !staff.userId?.isActive) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Only active staff can be assigned to maintenance requests"
      );
    }

    record.assignedTo = staff._id;
    await record.save();

    const staffUserId = staff.userId?._id || staff.userId;
    if (staffUserId) {
      await notificationService.createNotification({
        recipientUserId: staffUserId,
        actorUserId: actor.id,
        type: "maintenance_assigned",
        title: "New Maintenance Request Assigned",
        message: `You have been assigned a maintenance request: ${record.issue}.`,
        link: `/staff/maintenance/${record._id}`,
        entityType: "Maintenance",
        entityId: record._id.toString(),
      });
    }

    const refreshed = await populateMaintenanceById(record._id);
    return sanitizeMaintenance(refreshed);
  },

  async updateMaintenanceStatus(maintenanceId, actor, payload) {
    const record = await populateMaintenanceById(maintenanceId);
    const previousStatus = record.status;

    record.status = payload.status;
    applyCompletionDate(record);
    await record.save();

    await notificationService.createNotification({
      recipientUserId: record.reportedBy?._id || record.reportedBy,
      actorUserId: actor.id,
      type:
        record.status === MAINTENANCE_STATUS.COMPLETED ||
        record.status === MAINTENANCE_STATUS.CLOSED
          ? "maintenance_completed"
          : "maintenance_status_updated",
      title: "Maintenance Request Updated",
      message:
        previousStatus === record.status
          ? `Your maintenance request was reviewed. Current status: ${record.status}.`
          : `Your maintenance request status changed from ${previousStatus} to ${record.status}.`,
      link: `/student/maintenance-requests/${record._id}`,
      entityType: "Maintenance",
      entityId: record._id.toString(),
    });

    const refreshed = await populateMaintenanceById(record._id);
    return sanitizeMaintenance(refreshed);
  },
};
