import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/roles.js";
import { Complaint, COMPLAINT_STATUS } from "../models/Complaint.js";
import { Staff } from "../models/Staff.js";
import { Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeComplaint } from "../utils/sanitizeComplaint.js";

const studentUserProjection = "name email phone role profilePhoto isActive";
const staffUserProjection = "name email phone role profilePhoto isActive";

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
    severity: "severity",
    category: "category",
  };

  const field = mappedPath[sortBy] || "createdAt";
  return { [field]: direction, _id: 1 };
}

function buildStatusSummary(entries) {
  const summary = {
    totalComplaints: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  };

  entries.forEach((entry) => {
    if (entry._id === COMPLAINT_STATUS.OPEN) summary.open = entry.count;
    if (entry._id === COMPLAINT_STATUS.IN_PROGRESS) summary.inProgress = entry.count;
    if (entry._id === COMPLAINT_STATUS.RESOLVED) summary.resolved = entry.count;
    if (entry._id === COMPLAINT_STATUS.CLOSED) summary.closed = entry.count;
  });

  summary.totalComplaints = summary.open + summary.inProgress + summary.resolved + summary.closed;
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

async function populateComplaintById(complaintId) {
  const complaint = await Complaint.findById(complaintId)
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
    });

  if (!complaint) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Complaint not found");
  }

  return complaint;
}

function ensureComplaintOwnership(complaint, studentId) {
  if (complaint.student?._id?.toString() !== studentId.toString()) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Complaint not found");
  }
}

function ensureComplaintAssignedToStaff(complaint, staffId) {
  if (!complaint.assignedTo?._id || complaint.assignedTo._id.toString() !== staffId.toString()) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Complaint not found");
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

function applyStatusTransition(complaint, status) {
  complaint.status = status;

  if (status === COMPLAINT_STATUS.RESOLVED || status === COMPLAINT_STATUS.CLOSED) {
    complaint.resolutionDate = complaint.resolutionDate || new Date();
  }

  if (status === COMPLAINT_STATUS.OPEN || status === COMPLAINT_STATUS.IN_PROGRESS) {
    complaint.resolutionDate = null;
  }
}

export const complaintService = {
  async createMyComplaint(actor, payload) {
    const student = await ensureStudentProfile(actor.id);

    const complaint = await Complaint.create({
      student: student._id,
      title: normalizeString(payload.title),
      description: normalizeString(payload.description),
      category: payload.category,
      severity: payload.severity,
      attachments: normalizeAttachments(payload.attachments),
      status: COMPLAINT_STATUS.OPEN,
    });

    await notificationService.notifyRole(USER_ROLES.PROVOST, {
      actorUserId: actor.id,
      type: "complaint_submitted",
      title: "New Complaint Submitted",
      message: `${student.userId?.name || "A student"} submitted a complaint: ${complaint.title}.`,
      link: `/provost/complaints/${complaint._id}`,
      entityType: "Complaint",
      entityId: complaint._id.toString(),
    });

    const populated = await populateComplaintById(complaint._id);
    return sanitizeComplaint(populated);
  },

  async listMyComplaints(actor, query) {
    const student = await ensureStudentProfile(actor.id);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);

    const filters = {
      student: student._id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
    };

    const [items, total, grouped] = await Promise.all([
      Complaint.find(filters)
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
      Complaint.countDocuments(filters),
      Complaint.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      items: items.map((item) => sanitizeComplaint(item)),
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

  async getMyComplaintById(actor, complaintId) {
    const student = await ensureStudentProfile(actor.id);
    const complaint = await populateComplaintById(complaintId);
    ensureComplaintOwnership(complaint, student._id);
    return sanitizeComplaint(complaint);
  },

  async addMyComplaintFeedback(actor, complaintId, payload) {
    const student = await ensureStudentProfile(actor.id);
    const complaint = await populateComplaintById(complaintId);
    ensureComplaintOwnership(complaint, student._id);

    if (![COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED].includes(complaint.status)) {
      throw new ApiError(StatusCodes.CONFLICT, "Feedback is allowed only after complaint is resolved or closed");
    }

    const feedback = normalizeString(payload.feedback);
    if (!feedback && payload.rating === undefined) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Feedback or rating is required");
    }

    if (payload.feedback !== undefined) {
      complaint.feedback = feedback;
    }

    if (payload.rating !== undefined) {
      complaint.rating = Number(payload.rating);
    }

    await complaint.save();

    await notificationService.notifyRole(USER_ROLES.PROVOST, {
      actorUserId: actor.id,
      type: "complaint_feedback_submitted",
      title: "Complaint Feedback Submitted",
      message: `${complaint.student?.userId?.name || "A student"} submitted feedback for complaint: ${complaint.title}.`,
      link: `/provost/complaints/${complaint._id}`,
      entityType: "Complaint",
      entityId: complaint._id.toString(),
    });

    const refreshed = await populateComplaintById(complaint._id);
    return sanitizeComplaint(refreshed);
  },

  async listAssignedComplaints(actor, query) {
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

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      const studentIds = await resolveSearchStudentIds(searchRegex);

      filters.$or = [{ title: searchRegex }];
      if (studentIds.length) {
        filters.$or.push({ student: { $in: studentIds } });
      }
    }

    const [items, total, grouped] = await Promise.all([
      Complaint.find(filters)
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
      Complaint.countDocuments(filters),
      Complaint.aggregate([
        { $match: { assignedTo: staff._id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      items: items.map((item) => sanitizeComplaint(item)),
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

  async getAssignedComplaintById(actor, complaintId) {
    const staff = await ensureStaffProfile(actor.id);
    const complaint = await populateComplaintById(complaintId);
    ensureComplaintAssignedToStaff(complaint, staff._id);
    return sanitizeComplaint(complaint);
  },

  async updateAssignedComplaint(actor, complaintId, payload) {
    const staff = await ensureStaffProfile(actor.id);
    const complaint = await populateComplaintById(complaintId);
    ensureComplaintAssignedToStaff(complaint, staff._id);

    const previousStatus = complaint.status;

    if (payload.status) {
      applyStatusTransition(complaint, payload.status);
    }

    if (payload.resolution !== undefined) {
      complaint.resolution = normalizeString(payload.resolution);
    }

    await complaint.save();

    const studentUserId = complaint.student?.userId?._id || complaint.student?.userId;
    if (studentUserId) {
      await notificationService.createNotification({
        recipientUserId: studentUserId,
        actorUserId: actor.id,
        type: "complaint_status_updated",
        title: "Complaint Updated",
        message:
          previousStatus === complaint.status
            ? `Your complaint was updated by staff: ${complaint.title}.`
            : `Your complaint status changed from ${previousStatus} to ${complaint.status}.`,
        link: `/student/complaints/${complaint._id}`,
        entityType: "Complaint",
        entityId: complaint._id.toString(),
      });
    }

    const refreshed = await populateComplaintById(complaint._id);
    return sanitizeComplaint(refreshed);
  },

  async listComplaints(query) {
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
      const studentIds = await resolveSearchStudentIds(searchRegex);

      filters.$or = [{ title: searchRegex }];
      if (studentIds.length) {
        filters.$or.push({ student: { $in: studentIds } });
      }
    }

    const [items, total, grouped] = await Promise.all([
      Complaint.find(filters)
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
      Complaint.countDocuments(filters),
      Complaint.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = buildStatusSummary(grouped);
    summary.totalComplaints = total;

    return {
      items: items.map((item) => sanitizeComplaint(item)),
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

  async getComplaintById(complaintId) {
    const complaint = await populateComplaintById(complaintId);
    return sanitizeComplaint(complaint);
  },

  async assignComplaint(complaintId, actor, payload) {
    const complaint = await populateComplaintById(complaintId);
    const staff = await Staff.findById(payload.staffId).populate("userId", staffUserProjection);

    if (!staff) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Assigned staff not found");
    }

    if (!staff.isActive || !staff.userId?.isActive) {
      throw new ApiError(StatusCodes.CONFLICT, "Only active staff can be assigned to complaints");
    }

    complaint.assignedTo = staff._id;
    await complaint.save();

    const staffUserId = staff.userId?._id || staff.userId;
    if (staffUserId) {
      await notificationService.createNotification({
        recipientUserId: staffUserId,
        actorUserId: actor.id,
        type: "complaint_assigned",
        title: "New Complaint Assigned",
        message: `You have been assigned complaint: ${complaint.title}.`,
        link: `/staff/complaints/${complaint._id}`,
        entityType: "Complaint",
        entityId: complaint._id.toString(),
      });
    }

    const refreshed = await populateComplaintById(complaint._id);
    return sanitizeComplaint(refreshed);
  },

  async updateComplaintStatus(complaintId, actor, payload) {
    const complaint = await populateComplaintById(complaintId);
    const previousStatus = complaint.status;

    applyStatusTransition(complaint, payload.status);

    if (payload.resolution !== undefined) {
      complaint.resolution = normalizeString(payload.resolution);
    }

    await complaint.save();

    const studentUserId = complaint.student?.userId?._id || complaint.student?.userId;
    if (studentUserId) {
      await notificationService.createNotification({
        recipientUserId: studentUserId,
        actorUserId: actor.id,
        type: "complaint_status_updated",
        title: "Complaint Status Updated",
        message:
          previousStatus === complaint.status
            ? `Your complaint was reviewed. Current status: ${complaint.status}.`
            : `Your complaint status changed from ${previousStatus} to ${complaint.status}.`,
        link: `/student/complaints/${complaint._id}`,
        entityType: "Complaint",
        entityId: complaint._id.toString(),
      });
    }

    const refreshed = await populateComplaintById(complaint._id);
    return sanitizeComplaint(refreshed);
  },
};
