import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/roles.js";
import {
  SupportTicket,
  SUPPORT_TICKET_STATUS,
} from "../models/SupportTicket.js";
import { Staff } from "../models/Staff.js";
import { Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeSupportTicket } from "../utils/sanitizeSupportTicket.js";

const studentUserProjection = "name email phone role profilePhoto isActive";
const staffUserProjection = "name email phone role profilePhoto isActive";
const messageSenderProjection = "name email phone role profilePhoto isActive";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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

function normalizeSortStage(sortBy = "createdAt", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    status: "status",
    priority: "priority",
    category: "category",
  };

  const field = mappedPath[sortBy] || "createdAt";
  return { [field]: direction, _id: 1 };
}

function buildStatusSummary(entries) {
  const summary = {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  };

  entries.forEach((entry) => {
    if (entry._id === SUPPORT_TICKET_STATUS.OPEN) summary.open = entry.count;
    if (entry._id === SUPPORT_TICKET_STATUS.IN_PROGRESS) summary.inProgress = entry.count;
    if (entry._id === SUPPORT_TICKET_STATUS.RESOLVED) summary.resolved = entry.count;
    if (entry._id === SUPPORT_TICKET_STATUS.CLOSED) summary.closed = entry.count;
  });

  summary.total = summary.open + summary.inProgress + summary.resolved + summary.closed;
  return summary;
}

async function ensureStudentProfile(userId) {
  let student = await Student.findOne({ userId }).populate("userId", studentUserProjection);
  if (student) {
    return student;
  }

  const user = await User.findById(userId);
  if (!user || user.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Student profile not found");
  }

  student = await Student.create({
    userId: user._id,
    profilePhoto: user.profilePhoto || "",
  });

  return Student.findById(student._id).populate("userId", studentUserProjection);
}

async function ensureStaffProfile(userId) {
  const staff = await Staff.findOne({ userId }).populate("userId", staffUserProjection);
  if (!staff) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Staff profile not found");
  }

  return staff;
}

async function populateTicketById(ticketId) {
  const ticket = await SupportTicket.findById(ticketId)
    .populate({
      path: "student",
      populate: {
        path: "userId",
        select: studentUserProjection,
      },
    })
    .populate({
      path: "assignedTo",
      populate: {
        path: "userId",
        select: staffUserProjection,
      },
    })
    .populate({
      path: "messages.sender",
      select: messageSenderProjection,
    });

  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
  }

  return ticket;
}

function ensureTicketOwnership(ticket, studentId) {
  if (ticket.student?._id?.toString() !== studentId.toString()) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
  }
}

function ensureTicketAssignedToStaff(ticket, staffId) {
  if (!ticket.assignedTo?._id || ticket.assignedTo._id.toString() !== staffId.toString()) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
  }
}

function applyStatusTransition(ticket, status) {
  ticket.status = status;

  if (status === SUPPORT_TICKET_STATUS.RESOLVED || status === SUPPORT_TICKET_STATUS.CLOSED) {
    ticket.resolutionDate = ticket.resolutionDate || new Date();
  }

  if (status === SUPPORT_TICKET_STATUS.OPEN || status === SUPPORT_TICKET_STATUS.IN_PROGRESS) {
    ticket.resolutionDate = null;
  }
}

async function resolveSearchStudentIds(searchRegex) {
  const matchedUsers = await User.find({
    role: USER_ROLES.STUDENT,
    $or: [{ name: searchRegex }, { email: searchRegex }],
  })
    .select("_id")
    .lean();

  if (!matchedUsers.length) {
    return [];
  }

  const userIds = matchedUsers.map((user) => user._id);
  const matchedStudents = await Student.find({ userId: { $in: userIds } }).select("_id").lean();
  return matchedStudents.map((student) => student._id);
}

async function notifyTicketMessage(ticket, actor, senderRole) {
  const studentUserId = ticket.student?.userId?._id || ticket.student?.userId;
  const staffUserId = ticket.assignedTo?.userId?._id || ticket.assignedTo?.userId;

  if (senderRole === USER_ROLES.STUDENT) {
    if (staffUserId) {
      await notificationService.createNotification({
        recipientUserId: staffUserId,
        actorUserId: actor.id,
        type: "support_ticket_message",
        title: "New Support Ticket Message",
        message: `Student replied on ticket: ${ticket.subject}.`,
        link: `/staff/support-tickets/${ticket._id}`,
        entityType: "SupportTicket",
        entityId: ticket._id.toString(),
      });
      return;
    }

    await notificationService.notifyRole(USER_ROLES.PROVOST, {
      actorUserId: actor.id,
      type: "support_ticket_message",
      title: "New Support Ticket Message",
      message: `Student replied on unassigned ticket: ${ticket.subject}.`,
      link: `/provost/support-tickets/${ticket._id}`,
      entityType: "SupportTicket",
      entityId: ticket._id.toString(),
    });
    return;
  }

  if (studentUserId) {
    await notificationService.createNotification({
      recipientUserId: studentUserId,
      actorUserId: actor.id,
      type: "support_ticket_message",
      title: "Support Ticket Reply",
      message: `You have a new reply on ticket: ${ticket.subject}.`,
      link: `/student/support-tickets/${ticket._id}`,
      entityType: "SupportTicket",
      entityId: ticket._id.toString(),
    });
  }
}

export const supportTicketService = {
  async createMyTicket(actor, payload) {
    const student = await ensureStudentProfile(actor.id);

    const ticket = await SupportTicket.create({
      student: student._id,
      subject: normalizeString(payload.subject),
      description: normalizeString(payload.description),
      category: payload.category,
      priority: payload.priority,
      attachments: normalizeAttachments(payload.attachments),
      status: SUPPORT_TICKET_STATUS.OPEN,
    });

    await notificationService.notifyRole(USER_ROLES.PROVOST, {
      actorUserId: actor.id,
      type: "support_ticket_submitted",
      title: "New Support Ticket Submitted",
      message: `${student.userId?.name || "A student"} submitted a support ticket: ${ticket.subject}.`,
      link: `/provost/support-tickets/${ticket._id}`,
      entityType: "SupportTicket",
      entityId: ticket._id.toString(),
    });

    const populated = await populateTicketById(ticket._id);
    return sanitizeSupportTicket(populated);
  },

  async listMyTickets(actor, query) {
    const student = await ensureStudentProfile(actor.id);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);

    const filters = {
      student: student._id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      filters.$or = [{ subject: searchRegex }];
    }

    const [items, total, grouped] = await Promise.all([
      SupportTicket.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "student",
          populate: { path: "userId", select: studentUserProjection },
        })
        .populate({
          path: "assignedTo",
          populate: { path: "userId", select: staffUserProjection },
        }),
      SupportTicket.countDocuments(filters),
      SupportTicket.aggregate([
        { $match: filters },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      items: items.map((item) => sanitizeSupportTicket(item)),
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

  async getMyTicketById(actor, ticketId) {
    const student = await ensureStudentProfile(actor.id);
    const ticket = await populateTicketById(ticketId);
    ensureTicketOwnership(ticket, student._id);
    return sanitizeSupportTicket(ticket);
  },

  async addMyMessage(actor, ticketId, payload) {
    const student = await ensureStudentProfile(actor.id);
    const ticket = await populateTicketById(ticketId);
    ensureTicketOwnership(ticket, student._id);

    ticket.messages.push({
      sender: actor.id,
      message: normalizeString(payload.message),
      attachments: normalizeAttachments(payload.attachments),
      sentAt: new Date(),
    });

    await ticket.save();
    await notifyTicketMessage(ticket, actor, USER_ROLES.STUDENT);

    const refreshed = await populateTicketById(ticket._id);
    return sanitizeSupportTicket(refreshed);
  },

  async listAssignedTickets(actor, query) {
    const staff = await ensureStaffProfile(actor.id);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {
      assignedTo: staff._id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      const studentIds = await resolveSearchStudentIds(searchRegex);
      filters.$or = [{ subject: searchRegex }];
      if (studentIds.length) {
        filters.$or.push({ student: { $in: studentIds } });
      }
    }

    const [items, total, grouped] = await Promise.all([
      SupportTicket.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "student",
          populate: { path: "userId", select: studentUserProjection },
        })
        .populate({
          path: "assignedTo",
          populate: { path: "userId", select: staffUserProjection },
        }),
      SupportTicket.countDocuments(filters),
      SupportTicket.aggregate([
        { $match: { assignedTo: staff._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      items: items.map((item) => sanitizeSupportTicket(item)),
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

  async getAssignedTicketById(actor, ticketId) {
    const staff = await ensureStaffProfile(actor.id);
    const ticket = await populateTicketById(ticketId);
    ensureTicketAssignedToStaff(ticket, staff._id);
    return sanitizeSupportTicket(ticket);
  },

  async addAssignedMessage(actor, ticketId, payload) {
    const staff = await ensureStaffProfile(actor.id);
    const ticket = await populateTicketById(ticketId);
    ensureTicketAssignedToStaff(ticket, staff._id);

    ticket.messages.push({
      sender: actor.id,
      message: normalizeString(payload.message),
      attachments: normalizeAttachments(payload.attachments),
      sentAt: new Date(),
    });
    await ticket.save();

    await notifyTicketMessage(ticket, actor, USER_ROLES.STAFF);

    const refreshed = await populateTicketById(ticket._id);
    return sanitizeSupportTicket(refreshed);
  },

  async updateAssignedTicket(actor, ticketId, payload) {
    const staff = await ensureStaffProfile(actor.id);
    const ticket = await populateTicketById(ticketId);
    ensureTicketAssignedToStaff(ticket, staff._id);
    const previousStatus = ticket.status;

    if (payload.status) {
      applyStatusTransition(ticket, payload.status);
    }

    if (payload.resolution !== undefined) {
      ticket.resolution = normalizeString(payload.resolution);
    }

    await ticket.save();

    const studentUserId = ticket.student?.userId?._id || ticket.student?.userId;
    if (studentUserId) {
      const isResolvedLike =
        ticket.status === SUPPORT_TICKET_STATUS.RESOLVED ||
        ticket.status === SUPPORT_TICKET_STATUS.CLOSED;

      await notificationService.createNotification({
        recipientUserId: studentUserId,
        actorUserId: actor.id,
        type: isResolvedLike ? "support_ticket_resolved" : "support_ticket_status_updated",
        title: isResolvedLike ? "Support Ticket Resolved" : "Support Ticket Updated",
        message:
          previousStatus === ticket.status
            ? `Your support ticket was updated: ${ticket.subject}.`
            : `Your support ticket status changed from ${previousStatus} to ${ticket.status}.`,
        link: `/student/support-tickets/${ticket._id}`,
        entityType: "SupportTicket",
        entityId: ticket._id.toString(),
      });
    }

    const refreshed = await populateTicketById(ticket._id);
    return sanitizeSupportTicket(refreshed);
  },

  async listTickets(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {};

    if (query.category) filters.category = query.category;
    if (query.priority) filters.priority = query.priority;
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
      const studentIds = await resolveSearchStudentIds(searchRegex);

      filters.$or = [{ subject: searchRegex }];
      if (studentIds.length) {
        filters.$or.push({ student: { $in: studentIds } });
      }
    }

    const [items, total, grouped] = await Promise.all([
      SupportTicket.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "student",
          populate: { path: "userId", select: studentUserProjection },
        })
        .populate({
          path: "assignedTo",
          populate: { path: "userId", select: staffUserProjection },
        }),
      SupportTicket.countDocuments(filters),
      SupportTicket.aggregate([
        { $match: filters },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const summary = buildStatusSummary(grouped);
    summary.total = total;

    return {
      items: items.map((item) => sanitizeSupportTicket(item)),
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

  async getTicketById(ticketId) {
    const ticket = await populateTicketById(ticketId);
    return sanitizeSupportTicket(ticket);
  },

  async assignTicket(ticketId, actor, payload) {
    const ticket = await populateTicketById(ticketId);
    const staff = await Staff.findById(payload.staffId).populate("userId", staffUserProjection);

    if (!staff) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Assigned staff not found");
    }

    if (!staff.isActive || !staff.userId?.isActive) {
      throw new ApiError(StatusCodes.CONFLICT, "Only active staff can be assigned to support tickets");
    }

    ticket.assignedTo = staff._id;
    await ticket.save();

    const staffUserId = staff.userId?._id || staff.userId;
    if (staffUserId) {
      await notificationService.createNotification({
        recipientUserId: staffUserId,
        actorUserId: actor.id,
        type: "support_ticket_assigned",
        title: "New Support Ticket Assigned",
        message: `You have been assigned support ticket: ${ticket.subject}.`,
        link: `/staff/support-tickets/${ticket._id}`,
        entityType: "SupportTicket",
        entityId: ticket._id.toString(),
      });
    }

    const refreshed = await populateTicketById(ticket._id);
    return sanitizeSupportTicket(refreshed);
  },

  async updateTicketStatus(ticketId, actor, payload) {
    const ticket = await populateTicketById(ticketId);
    const previousStatus = ticket.status;

    applyStatusTransition(ticket, payload.status);

    if (payload.resolution !== undefined) {
      ticket.resolution = normalizeString(payload.resolution);
    }

    await ticket.save();

    const studentUserId = ticket.student?.userId?._id || ticket.student?.userId;
    if (studentUserId) {
      const isResolvedLike =
        ticket.status === SUPPORT_TICKET_STATUS.RESOLVED ||
        ticket.status === SUPPORT_TICKET_STATUS.CLOSED;

      await notificationService.createNotification({
        recipientUserId: studentUserId,
        actorUserId: actor.id,
        type: isResolvedLike ? "support_ticket_resolved" : "support_ticket_status_updated",
        title: isResolvedLike ? "Support Ticket Resolved" : "Support Ticket Status Updated",
        message:
          previousStatus === ticket.status
            ? `Your support ticket was reviewed. Current status: ${ticket.status}.`
            : `Your support ticket status changed from ${previousStatus} to ${ticket.status}.`,
        link: `/student/support-tickets/${ticket._id}`,
        entityType: "SupportTicket",
        entityId: ticket._id.toString(),
      });
    }

    const refreshed = await populateTicketById(ticket._id);
    return sanitizeSupportTicket(refreshed);
  },

  async addProvostMessage(ticketId, actor, payload) {
    const ticket = await populateTicketById(ticketId);
    ticket.messages.push({
      sender: actor.id,
      message: normalizeString(payload.message),
      attachments: normalizeAttachments(payload.attachments),
      sentAt: new Date(),
    });
    await ticket.save();

    await notifyTicketMessage(ticket, actor, USER_ROLES.PROVOST);

    const refreshed = await populateTicketById(ticket._id);
    return sanitizeSupportTicket(refreshed);
  },
};
