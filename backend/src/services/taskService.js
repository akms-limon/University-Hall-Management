import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.js";
import { Room } from "../models/Room.js";
import { Staff } from "../models/Staff.js";
import { Task, TASK_STATUS } from "../models/Task.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeTask } from "../utils/sanitizeTask.js";

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
    priority: "priority",
    dueDate: "dueDate",
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

function normalizeAttachments(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => normalizeString(value)).filter(Boolean);
}

function buildStatusSummary(entries) {
  const summary = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  entries.forEach((entry) => {
    if (entry._id === TASK_STATUS.PENDING) summary.pending = entry.count;
    if (entry._id === TASK_STATUS.IN_PROGRESS) summary.inProgress = entry.count;
    if (entry._id === TASK_STATUS.COMPLETED) summary.completed = entry.count;
    if (entry._id === TASK_STATUS.CANCELLED) summary.cancelled = entry.count;
  });

  summary.total = summary.pending + summary.inProgress + summary.completed + summary.cancelled;
  return summary;
}

function applyCompletionDate(task) {
  if (task.status === TASK_STATUS.COMPLETED && !task.completionDate) {
    task.completionDate = new Date();
  }

  if (task.status !== TASK_STATUS.COMPLETED) {
    task.completionDate = null;
  }
}

async function ensureStaffProfile(userId) {
  const staff = await Staff.findOne({ userId }).populate("userId", staffUserProjection);
  if (!staff) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Staff profile not found");
  }
  return staff;
}

async function ensureAssignableStaff(staffId) {
  const staff = await Staff.findById(staffId).populate("userId", staffUserProjection);
  if (!staff) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Assigned staff not found");
  }

  if (!staff.isActive || !staff.userId?.isActive) {
    throw new ApiError(StatusCodes.CONFLICT, "Only active staff can be assigned to tasks");
  }

  return staff;
}

async function ensureRoomExists(roomId) {
  if (!roomId) {
    return null;
  }

  const room = await Room.findById(roomId).select(roomProjection);
  if (!room || !room.isActive) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Room not found");
  }

  return room;
}

async function populateTaskById(taskId) {
  const task = await Task.findById(taskId)
    .populate({
      path: "assignedTo",
      populate: {
        path: "userId",
        select: staffUserProjection,
      },
    })
    .populate("room", roomProjection);

  if (!task) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Task not found");
  }

  return task;
}

function ensureTaskAssignedToStaff(task, staffId) {
  if (!task.assignedTo?._id || task.assignedTo._id.toString() !== staffId.toString()) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Task not found");
  }
}

async function resolveSearchStaffIds(searchRegex) {
  const users = await User.find({
    role: USER_ROLES.STAFF,
    $or: [{ name: searchRegex }, { email: searchRegex }],
  })
    .select("_id")
    .lean();

  if (!users.length) {
    return [];
  }

  const userIds = users.map((user) => user._id);
  const staffs = await Staff.find({ userId: { $in: userIds } }).select("_id").lean();
  return staffs.map((staff) => staff._id);
}

async function resolveSearchRoomIds(searchRegex) {
  const rooms = await Room.find({ roomNumber: searchRegex }).select("_id").lean();
  return rooms.map((room) => room._id);
}

export const taskService = {
  async createTask(actor, payload) {
    const staff = await ensureAssignableStaff(payload.assignedTo);
    await ensureRoomExists(payload.room);

    const task = await Task.create({
      title: normalizeString(payload.title),
      description: normalizeString(payload.description),
      assignedTo: payload.assignedTo,
      room: payload.room || null,
      taskType: payload.taskType,
      priority: payload.priority,
      status: TASK_STATUS.PENDING,
      dueDate: payload.dueDate,
      attachments: normalizeAttachments(payload.attachments),
    });

    const assignedUserId = staff.userId?._id || staff.userId;
    if (assignedUserId) {
      await notificationService.createNotification({
        recipientUserId: assignedUserId,
        actorUserId: actor.id,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You have a new task: ${task.title}.`,
        link: `/staff/assigned-tasks/${task._id}`,
        entityType: "Task",
        entityId: task._id.toString(),
      });
    }

    const populated = await populateTaskById(task._id);
    return sanitizeTask(populated);
  },

  async listAssignedTasks(actor, query) {
    const staff = await ensureStaffProfile(actor.id);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {
      assignedTo: staff._id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.taskType ? { taskType: query.taskType } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    if (query.startDate || query.endDate) {
      filters.dueDate = {};
      if (query.startDate) {
        const startDate = normalizeDateBoundary(query.startDate, "start");
        if (startDate) filters.dueDate.$gte = startDate;
      }
      if (query.endDate) {
        const endDate = normalizeDateBoundary(query.endDate, "end");
        if (endDate) filters.dueDate.$lte = endDate;
      }
      if (!Object.keys(filters.dueDate).length) {
        delete filters.dueDate;
      }
    }

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      filters.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const now = new Date();
    const [items, total, grouped, overdue] = await Promise.all([
      Task.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "assignedTo",
          populate: { path: "userId", select: staffUserProjection },
        })
        .populate("room", roomProjection),
      Task.countDocuments(filters),
      Task.aggregate([{ $match: filters }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Task.countDocuments({
        assignedTo: staff._id,
        status: { $in: [TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS] },
        dueDate: { $lt: now },
      }),
    ]);

    return {
      items: items.map((item) => sanitizeTask(item)),
      summary: {
        ...buildStatusSummary(grouped),
        overdue,
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

  async getAssignedTaskById(actor, taskId) {
    const staff = await ensureStaffProfile(actor.id);
    const task = await populateTaskById(taskId);
    ensureTaskAssignedToStaff(task, staff._id);
    return sanitizeTask(task);
  },

  async updateAssignedTask(actor, taskId, payload) {
    const staff = await ensureStaffProfile(actor.id);
    const task = await populateTaskById(taskId);
    ensureTaskAssignedToStaff(task, staff._id);
    const previousStatus = task.status;

    if (payload.status) {
      task.status = payload.status;
      applyCompletionDate(task);
    }

    if (payload.completionNotes !== undefined) {
      task.completionNotes = normalizeString(payload.completionNotes);
    }

    if (Array.isArray(payload.completionPhotos)) {
      task.completionPhotos = normalizeAttachments(payload.completionPhotos);
    }

    await task.save();

    const isCompleted = task.status === TASK_STATUS.COMPLETED;
    await notificationService.notifyRole(USER_ROLES.PROVOST, {
      actorUserId: actor.id,
      type: isCompleted ? "task_completed" : "task_status_updated",
      title: isCompleted ? "Task Completed" : "Task Updated",
      message:
        previousStatus === task.status
          ? `Task updated by staff: ${task.title}.`
          : `Task status changed from ${previousStatus} to ${task.status}: ${task.title}.`,
      link: `/provost/staff-tasks/${task._id}`,
      entityType: "Task",
      entityId: task._id.toString(),
    });

    const refreshed = await populateTaskById(task._id);
    return sanitizeTask(refreshed);
  },

  async listTasks(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {};

    if (query.taskType) filters.taskType = query.taskType;
    if (query.priority) filters.priority = query.priority;
    if (query.status) filters.status = query.status;
    if (query.assignedTo) filters.assignedTo = query.assignedTo;
    if (query.room) filters.room = query.room;

    if (query.startDate || query.endDate) {
      filters.dueDate = {};
      if (query.startDate) {
        const startDate = normalizeDateBoundary(query.startDate, "start");
        if (startDate) filters.dueDate.$gte = startDate;
      }
      if (query.endDate) {
        const endDate = normalizeDateBoundary(query.endDate, "end");
        if (endDate) filters.dueDate.$lte = endDate;
      }
      if (!Object.keys(filters.dueDate).length) {
        delete filters.dueDate;
      }
    }

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      const [staffIds, roomIds] = await Promise.all([
        resolveSearchStaffIds(searchRegex),
        resolveSearchRoomIds(searchRegex),
      ]);

      filters.$or = [{ title: searchRegex }, { description: searchRegex }];
      if (staffIds.length) filters.$or.push({ assignedTo: { $in: staffIds } });
      if (roomIds.length) filters.$or.push({ room: { $in: roomIds } });
    }

    const [items, total, grouped] = await Promise.all([
      Task.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "assignedTo",
          populate: { path: "userId", select: staffUserProjection },
        })
        .populate("room", roomProjection),
      Task.countDocuments(filters),
      Task.aggregate([
        {
          $match: {
            ...filters,
            ...(typeof query.assignedTo === "string" ? { assignedTo: new mongoose.Types.ObjectId(query.assignedTo) } : {}),
            ...(typeof query.room === "string" ? { room: new mongoose.Types.ObjectId(query.room) } : {}),
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const summary = buildStatusSummary(grouped);
    summary.total = total;

    return {
      items: items.map((item) => sanitizeTask(item)),
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

  async getTaskById(taskId) {
    const task = await populateTaskById(taskId);
    return sanitizeTask(task);
  },

  async updateTask(taskId, actor, payload) {
    const task = await populateTaskById(taskId);
    const previousAssignee = task.assignedTo;
    let nextAssignedStaff = null;

    if (payload.assignedTo) {
      nextAssignedStaff = await ensureAssignableStaff(payload.assignedTo);
      task.assignedTo = payload.assignedTo;
    }

    if (payload.room !== undefined) {
      if (payload.room === null) {
        task.room = null;
      } else {
        await ensureRoomExists(payload.room);
        task.room = payload.room;
      }
    }

    if (payload.title !== undefined) task.title = normalizeString(payload.title);
    if (payload.description !== undefined) task.description = normalizeString(payload.description);
    if (payload.taskType !== undefined) task.taskType = payload.taskType;
    if (payload.priority !== undefined) task.priority = payload.priority;
    if (payload.dueDate !== undefined) task.dueDate = payload.dueDate;
    if (Array.isArray(payload.attachments)) task.attachments = normalizeAttachments(payload.attachments);

    await task.save();

    if (nextAssignedStaff) {
      const nextUserId = nextAssignedStaff.userId?._id || nextAssignedStaff.userId;
      if (nextUserId) {
        await notificationService.createNotification({
          recipientUserId: nextUserId,
          actorUserId: actor.id,
          type: "task_assigned",
          title: "Task Assigned",
          message: `You have been assigned task: ${task.title}.`,
          link: `/staff/assigned-tasks/${task._id}`,
          entityType: "Task",
          entityId: task._id.toString(),
        });
      }

      if (previousAssignee?._id && previousAssignee._id.toString() !== nextAssignedStaff._id.toString()) {
        const prevUserId = previousAssignee.userId?._id || previousAssignee.userId;
        if (prevUserId) {
          await notificationService.createNotification({
            recipientUserId: prevUserId,
            actorUserId: actor.id,
            type: "task_reassigned",
            title: "Task Reassigned",
            message: `Task was reassigned by provost: ${task.title}.`,
            link: `/staff/assigned-tasks`,
            entityType: "Task",
            entityId: task._id.toString(),
          });
        }
      }
    }

    const refreshed = await populateTaskById(task._id);
    return sanitizeTask(refreshed);
  },

  async updateTaskStatus(taskId, actor, payload) {
    const task = await populateTaskById(taskId);
    const previousStatus = task.status;

    task.status = payload.status;
    applyCompletionDate(task);

    if (payload.completionNotes !== undefined) {
      task.completionNotes = normalizeString(payload.completionNotes);
    }

    if (Array.isArray(payload.completionPhotos)) {
      task.completionPhotos = normalizeAttachments(payload.completionPhotos);
    }

    await task.save();

    const assigneeUserId = task.assignedTo?.userId?._id || task.assignedTo?.userId;
    if (assigneeUserId) {
      await notificationService.createNotification({
        recipientUserId: assigneeUserId,
        actorUserId: actor.id,
        type: "task_status_updated",
        title: "Task Status Updated",
        message:
          previousStatus === task.status
            ? `Task updated by provost: ${task.title}.`
            : `Task status changed from ${previousStatus} to ${task.status}: ${task.title}.`,
        link: `/staff/assigned-tasks/${task._id}`,
        entityType: "Task",
        entityId: task._id.toString(),
      });
    }

    const refreshed = await populateTaskById(task._id);
    return sanitizeTask(refreshed);
  },
};
