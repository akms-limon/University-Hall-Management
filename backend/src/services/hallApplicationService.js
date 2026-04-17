import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/roles.js";
import {
  HallApplication,
  HALL_APPLICATION_REQUEST_TYPE,
  HALL_APPLICATION_STATUS,
  hallApplicationActiveStatusList,
  hallApplicationStatusList,
} from "../models/HallApplication.js";
import { Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeHallApplication } from "../utils/sanitizeHallApplication.js";

const studentUserProjection = "name email phone role profilePhoto isActive";
const reviewerProjection = "name email phone role profilePhoto isActive";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeAttachments(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => normalizeString(value)).filter(Boolean);
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

function normalizeSortStage(sortBy = "applicationDate", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    applicationDate: "applicationDate",
    status: "status",
    department: "department",
    semester: "semester",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  };

  const field = mappedPath[sortBy] || "applicationDate";
  return { [field]: direction, _id: 1 };
}

function buildStatusSummary(entries) {
  const summary = {
    totalApplications: 0,
    totalNewRequests: 0,
    totalTransferRequests: 0,
    pending: 0,
    underReview: 0,
    meetingScheduled: 0,
    approved: 0,
    rejected: 0,
    waitlisted: 0,
  };

  entries.forEach((entry) => {
    if (entry._id === HALL_APPLICATION_STATUS.PENDING) summary.pending = entry.count;
    if (entry._id === HALL_APPLICATION_STATUS.UNDER_REVIEW) summary.underReview = entry.count;
    if (entry._id === HALL_APPLICATION_STATUS.MEETING_SCHEDULED) summary.meetingScheduled = entry.count;
    if (entry._id === HALL_APPLICATION_STATUS.APPROVED) summary.approved = entry.count;
    if (entry._id === HALL_APPLICATION_STATUS.REJECTED) summary.rejected = entry.count;
    if (entry._id === HALL_APPLICATION_STATUS.WAITLISTED) summary.waitlisted = entry.count;
  });

  summary.totalApplications =
    summary.pending +
    summary.underReview +
    summary.meetingScheduled +
    summary.approved +
    summary.rejected +
    summary.waitlisted;

  return summary;
}

async function ensureStudentProfile(userId) {
  let student = await Student.findOne({ userId })
    .populate("userId", studentUserProjection)
    .populate("currentRoom", "roomNumber floor wing status isActive occupants capacity");
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

  return Student.findById(student._id)
    .populate("userId", studentUserProjection)
    .populate("currentRoom", "roomNumber floor wing status isActive occupants capacity");
}

async function populateApplicationById(applicationId) {
  const application = await HallApplication.findById(applicationId)
    .populate({
      path: "student",
      populate: {
        path: "userId",
        select: studentUserProjection,
      },
    })
    .populate("reviewedBy", reviewerProjection)
    .populate("desiredRoom", "roomNumber floor wing status isActive occupants capacity");

  if (!application) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Hall application not found");
  }

  return application;
}

function ensureOwnership(application, studentId) {
  if (application.student?._id?.toString() !== studentId.toString()) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Hall application not found");
  }
}

async function resolveSearchStudentIds(searchRegex) {
  const matchedUsers = await User.find({
    role: USER_ROLES.STUDENT,
    $or: [{ name: searchRegex }, { email: searchRegex }],
  })
    .select("_id")
    .lean();

  const userIds = matchedUsers.map((user) => user._id);
  const studentOr = [{ registrationNumber: searchRegex }];
  if (userIds.length) {
    studentOr.push({ userId: { $in: userIds } });
  }

  const matchedStudents = await Student.find({ $or: studentOr }).select("_id").lean();
  return matchedStudents.map((student) => student._id);
}

function applyReviewMetadata(application, reviewerId) {
  application.reviewedBy = reviewerId;
}

function ensureStatusValidation(status, payload, existing) {
  if (status === HALL_APPLICATION_STATUS.REJECTED) {
    const reason = payload.rejectionReason ?? existing.rejectionReason;
    if (!normalizeString(reason)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Rejection reason is required for rejected status");
    }
  }

  if (status === HALL_APPLICATION_STATUS.MEETING_SCHEDULED) {
    const meetingDate = payload.meetingDate ?? existing.meetingDate;
    if (!meetingDate) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Meeting date is required for meeting scheduled status");
    }
  }
}

export const hallApplicationService = {
  async submitMyApplication(actor, payload) {
    const student = await ensureStudentProfile(actor.id);
    const requestedType = payload.requestType || HALL_APPLICATION_REQUEST_TYPE.NEW_ROOM_REQUEST;
    if (requestedType !== HALL_APPLICATION_REQUEST_TYPE.NEW_ROOM_REQUEST) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Transfer requests are handled in Allocation Application, not General Application."
      );
    }
    const activeExisting = await HallApplication.findOne({
      student: student._id,
      status: { $in: hallApplicationActiveStatusList },
    }).lean();

    if (activeExisting) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "You already have an active hall application. Please wait for review."
      );
    }

    const application = await HallApplication.create({
      student: student._id,
      registrationNumber: normalizeString(payload.registrationNumber),
      department: normalizeString(payload.department),
      semester: payload.semester,
      contactPhone: normalizeString(payload.contactPhone) || student.userId?.phone || "",
      emergencyContact: normalizeEmergencyContact(payload.emergencyContact),
      reason: normalizeString(payload.reason),
      requestType: requestedType,
      currentRoomNumber: "",
      desiredRoom: null,
      desiredRoomNumber: "",
      attachments: normalizeAttachments(payload.attachments),
      status: HALL_APPLICATION_STATUS.PENDING,
      applicationDate: new Date(),
    });
    await notificationService.notifyRole(USER_ROLES.PROVOST, {
      actorUserId: actor.id,
      type: "hall_application_submitted",
      title: "New Hall Application",
      message: `${student.userId?.name || "A student"} submitted a hall application.`,
      link: `/provost/general-applications/${application._id}`,
      entityType: "HallApplication",
      entityId: application._id.toString(),
    });

    const populated = await populateApplicationById(application._id);
    return sanitizeHallApplication(populated);
  },

  async listMyApplications(actor, query) {
    const student = await ensureStudentProfile(actor.id);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);

    const filters = {
      student: student._id,
      requestType: query.requestType || HALL_APPLICATION_REQUEST_TYPE.NEW_ROOM_REQUEST,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total, grouped] = await Promise.all([
      HallApplication.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "student",
          populate: { path: "userId", select: studentUserProjection },
        })
        .populate("reviewedBy", reviewerProjection)
        .populate("desiredRoom", "roomNumber floor wing status isActive occupants capacity"),
      HallApplication.countDocuments(filters),
      HallApplication.aggregate([
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
      items: items.map((item) => sanitizeHallApplication(item)),
      summary: buildStatusSummary(grouped),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "applicationDate",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getMyLatestApplication(actor) {
    const student = await ensureStudentProfile(actor.id);
    const application = await HallApplication.findOne({ student: student._id })
      .sort({ applicationDate: -1, _id: -1 })
      .populate({
        path: "student",
        populate: { path: "userId", select: studentUserProjection },
      })
      .populate("reviewedBy", reviewerProjection)
      .populate("desiredRoom", "roomNumber floor wing status isActive occupants capacity");

    return application ? sanitizeHallApplication(application) : null;
  },

  async getMyApplicationById(actor, applicationId) {
    const student = await ensureStudentProfile(actor.id);
    const application = await populateApplicationById(applicationId);
    ensureOwnership(application, student._id);
    return sanitizeHallApplication(application);
  },

  async updateMyApplication(actor, applicationId, payload) {
    const student = await ensureStudentProfile(actor.id);
    const application = await populateApplicationById(applicationId);
    ensureOwnership(application, student._id);

    if (application.status !== HALL_APPLICATION_STATUS.PENDING) {
      throw new ApiError(StatusCodes.CONFLICT, "Only pending applications can be edited");
    }

    if (payload.registrationNumber !== undefined) {
      application.registrationNumber = normalizeString(payload.registrationNumber);
    }
    if (payload.department !== undefined) {
      application.department = normalizeString(payload.department);
    }
    if (payload.semester !== undefined) {
      application.semester = payload.semester;
    }
    if (payload.contactPhone !== undefined) {
      application.contactPhone = normalizeString(payload.contactPhone);
    }
    if (payload.reason !== undefined) {
      application.reason = normalizeString(payload.reason);
    }
    if (payload.attachments !== undefined) {
      application.attachments = normalizeAttachments(payload.attachments);
    }
    if (payload.emergencyContact !== undefined) {
      application.emergencyContact = normalizeEmergencyContact(payload.emergencyContact, application.emergencyContact);
    }
    await application.save();
    const refreshed = await populateApplicationById(application._id);
    return sanitizeHallApplication(refreshed);
  },

  async listHallApplications(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {};

    if (query.department) {
      filters.department = query.department;
    }
    if (typeof query.semester === "number") {
      filters.semester = query.semester;
    }
    if (query.status) {
      filters.status = query.status;
    }
    filters.requestType = query.requestType || HALL_APPLICATION_REQUEST_TYPE.NEW_ROOM_REQUEST;
    if (typeof query.hasMeeting === "boolean") {
      filters.meetingDate = query.hasMeeting ? { $ne: null } : null;
    }

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      const studentIds = await resolveSearchStudentIds(searchRegex);

      filters.$or = [{ registrationNumber: searchRegex }];
      if (studentIds.length) {
        filters.$or.push({ student: { $in: studentIds } });
      }
    }

    const [items, total, grouped, groupedRequestType] = await Promise.all([
      HallApplication.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "student",
          populate: { path: "userId", select: studentUserProjection },
        })
        .populate("reviewedBy", reviewerProjection)
        .populate("desiredRoom", "roomNumber floor wing status isActive occupants capacity"),
      HallApplication.countDocuments(filters),
      HallApplication.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      HallApplication.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$requestType",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = buildStatusSummary(grouped);
    summary.totalApplications = total;
    summary.totalNewRequests =
      groupedRequestType.find((entry) => entry._id === HALL_APPLICATION_REQUEST_TYPE.NEW_ROOM_REQUEST)
        ?.count || 0;
    summary.totalTransferRequests =
      groupedRequestType.find((entry) => entry._id === HALL_APPLICATION_REQUEST_TYPE.TRANSFER_REQUEST)
        ?.count || 0;

    return {
      items: items.map((item) => sanitizeHallApplication(item)),
      summary,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "applicationDate",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getHallApplicationById(applicationId) {
    const application = await populateApplicationById(applicationId);
    return sanitizeHallApplication(application);
  },

  async updateReview(applicationId, actor, payload) {
    const application = await populateApplicationById(applicationId);
    applyReviewMetadata(application, actor.id);

    if (payload.reviewNote !== undefined) {
      application.reviewNote = normalizeString(payload.reviewNote);
    }
    if (payload.meetingNote !== undefined) {
      application.meetingNote = normalizeString(payload.meetingNote);
    }
    if (payload.meetingDate !== undefined) {
      application.meetingDate = payload.meetingDate;
      if (payload.meetingDate) {
        application.status = HALL_APPLICATION_STATUS.MEETING_SCHEDULED;
      }
    }

    await application.save();
    const refreshed = await populateApplicationById(application._id);
    return sanitizeHallApplication(refreshed);
  },

  async updateStatus(applicationId, actor, payload) {
    const application = await populateApplicationById(applicationId);
    const previousStatus = application.status;
    ensureStatusValidation(payload.status, payload, application);

    application.status = payload.status;
    applyReviewMetadata(application, actor.id);

    if (payload.reviewNote !== undefined) {
      application.reviewNote = normalizeString(payload.reviewNote);
    }
    if (payload.meetingDate !== undefined) {
      application.meetingDate = payload.meetingDate;
    }
    if (payload.meetingNote !== undefined) {
      application.meetingNote = normalizeString(payload.meetingNote);
    }
    if (payload.approvalNote !== undefined) {
      application.approvalNote = normalizeString(payload.approvalNote);
    }
    if (payload.rejectionReason !== undefined) {
      application.rejectionReason = normalizeString(payload.rejectionReason);
    }

    if (payload.status === HALL_APPLICATION_STATUS.APPROVED) {
      application.rejectionReason = "";
    }
    if (payload.status === HALL_APPLICATION_STATUS.REJECTED) {
      application.approvalNote = "";
    }

    await application.save();
    const studentUserId = application.student?.userId?._id || application.student?.userId;
    if (studentUserId) {
      await notificationService.createNotification({
        recipientUserId: studentUserId,
        actorUserId: actor.id,
        type: "hall_application_status_changed",
        title: "Hall Application Updated",
        message:
          previousStatus === payload.status
            ? `Your hall application was reviewed. Current status: ${payload.status.replace("_", " ")}.`
            : `Your hall application status changed from ${previousStatus.replace("_", " ")} to ${payload.status.replace("_", " ")}.`,
        link: `/student/general-application/${application._id}`,
        entityType: "HallApplication",
        entityId: application._id.toString(),
      });
    }

    const refreshed = await populateApplicationById(application._id);
    return sanitizeHallApplication(refreshed);
  },

  async scheduleMeeting(applicationId, actor, payload) {
    return this.updateStatus(applicationId, actor, {
      status: HALL_APPLICATION_STATUS.MEETING_SCHEDULED,
      meetingDate: payload.meetingDate,
      meetingNote: payload.meetingNote,
    });
  },

  async approveApplication(applicationId, actor, payload = {}) {
    return this.updateStatus(applicationId, actor, {
      status: HALL_APPLICATION_STATUS.APPROVED,
      approvalNote: payload.approvalNote,
    });
  },

  async rejectApplication(applicationId, actor, payload) {
    return this.updateStatus(applicationId, actor, {
      status: HALL_APPLICATION_STATUS.REJECTED,
      rejectionReason: payload.rejectionReason,
    });
  },

  async waitlistApplication(applicationId, actor, payload = {}) {
    return this.updateStatus(applicationId, actor, {
      status: HALL_APPLICATION_STATUS.WAITLISTED,
      reviewNote: payload.reviewNote,
    });
  },

  hallApplicationStatuses() {
    return hallApplicationStatusList;
  },
};
