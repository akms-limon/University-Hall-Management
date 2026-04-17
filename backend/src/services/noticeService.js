import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../constants/roles.js";
import { Notice, NOTICE_TARGET_AUDIENCE } from "../models/Notice.js";
import { Room } from "../models/Room.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeNotice } from "../utils/sanitizeNotice.js";

const userProjection = "name email phone role profilePhoto isActive";
const roomProjection = "roomNumber floor wing status isActive";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeSortStage(sortBy = "publishedDate", sortOrder = "desc") {
  const direction = sortOrder === "asc" ? 1 : -1;
  const mappedPath = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    publishedDate: "publishedDate",
    expiryDate: "expiryDate",
    views: "views",
    title: "title",
  };
  const field = mappedPath[sortBy] || "publishedDate";
  return { [field]: direction, _id: direction };
}

function normalizeDateBoundary(value, boundary = "start") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (boundary === "end") {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function normalizeAttachments(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => normalizeString(value)).filter(Boolean);
}

function normalizeObjectIdArray(values) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((value) => String(value))));
}

function buildVisibilityAudienceFilter(actor) {
  if (actor.role === USER_ROLES.STUDENT) {
    return {
      $or: [
        { targetAudience: NOTICE_TARGET_AUDIENCE.ALL },
        { targetAudience: NOTICE_TARGET_AUDIENCE.STUDENTS },
        { targetAudience: NOTICE_TARGET_AUDIENCE.SPECIFIC, targetUsers: actor.id },
      ],
    };
  }

  if (actor.role === USER_ROLES.STAFF) {
    return {
      $or: [
        { targetAudience: NOTICE_TARGET_AUDIENCE.ALL },
        { targetAudience: NOTICE_TARGET_AUDIENCE.STAFF },
        { targetAudience: NOTICE_TARGET_AUDIENCE.SPECIFIC, targetUsers: actor.id },
      ],
    };
  }

  if (actor.role === USER_ROLES.PROVOST) {
    return {
      $or: [
        { targetAudience: NOTICE_TARGET_AUDIENCE.ALL },
        { targetAudience: NOTICE_TARGET_AUDIENCE.PROVOST },
        { targetAudience: NOTICE_TARGET_AUDIENCE.SPECIFIC, targetUsers: actor.id },
      ],
    };
  }

  return { _id: null };
}

function buildBasePublicFilter() {
  const now = new Date();
  return {
    isActive: true,
    publishedDate: { $lte: now },
    $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
  };
}

function buildNoticeSummary(entries) {
  let total = 0;
  let active = 0;
  let inactive = 0;
  let urgent = 0;

  entries.forEach((entry) => {
    total += entry.count;
    if (entry._id?.isActive) active += entry.count;
    if (entry._id?.isActive === false) inactive += entry.count;
    if (entry._id?.isUrgent) urgent += entry.count;
  });

  return { total, active, inactive, urgent };
}

async function ensureRoomsExist(roomIds) {
  if (!Array.isArray(roomIds) || !roomIds.length) return;
  const count = await Room.countDocuments({ _id: { $in: roomIds }, isActive: true });
  if (count !== roomIds.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "One or more rooms are invalid or inactive");
  }
}

async function ensureTargetUsersExist(targetUserIds) {
  if (!Array.isArray(targetUserIds) || !targetUserIds.length) return;
  const count = await User.countDocuments({ _id: { $in: targetUserIds }, isActive: true });
  if (count !== targetUserIds.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "One or more target users are invalid or inactive");
  }
}

async function populateNoticeById(noticeId) {
  const notice = await Notice.findById(noticeId)
    .populate("publishedBy", userProjection)
    .populate("targetUsers", userProjection)
    .populate("applicableRooms", roomProjection);

  if (!notice) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Notice not found");
  }

  return notice;
}

function ensureNoticeVisibilityForActor(notice, actor) {
  if (actor.role === USER_ROLES.PROVOST) return;

  const targetAudience = notice.targetAudience;
  const targetUsers = Array.isArray(notice.targetUsers)
    ? notice.targetUsers.map((entry) => String(entry?._id || entry))
    : [];
  const isTargetedUser = targetUsers.includes(String(actor.id));

  if (actor.role === USER_ROLES.STUDENT) {
    const allowed =
      targetAudience === NOTICE_TARGET_AUDIENCE.ALL ||
      targetAudience === NOTICE_TARGET_AUDIENCE.STUDENTS ||
      (targetAudience === NOTICE_TARGET_AUDIENCE.SPECIFIC && isTargetedUser);
    if (!allowed) throw new ApiError(StatusCodes.NOT_FOUND, "Notice not found");
  }

  if (actor.role === USER_ROLES.STAFF) {
    const allowed =
      targetAudience === NOTICE_TARGET_AUDIENCE.ALL ||
      targetAudience === NOTICE_TARGET_AUDIENCE.STAFF ||
      (targetAudience === NOTICE_TARGET_AUDIENCE.SPECIFIC && isTargetedUser);
    if (!allowed) throw new ApiError(StatusCodes.NOT_FOUND, "Notice not found");
  }

  if (!notice.isActive) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Notice not found");
  }
  const now = new Date();
  if (notice.publishedDate && notice.publishedDate > now) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Notice not found");
  }
  if (notice.expiryDate && notice.expiryDate < now) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Notice not found");
  }
}

async function resolveAudienceUsers(notice) {
  if (notice.targetAudience === NOTICE_TARGET_AUDIENCE.ALL) {
    const users = await User.find({
      role: { $in: [USER_ROLES.STUDENT, USER_ROLES.STAFF, USER_ROLES.PROVOST] },
      isActive: true,
    })
      .select("_id role")
      .lean();
    return users;
  }

  if (notice.targetAudience === NOTICE_TARGET_AUDIENCE.STUDENTS) {
    return User.find({ role: USER_ROLES.STUDENT, isActive: true }).select("_id role").lean();
  }

  if (notice.targetAudience === NOTICE_TARGET_AUDIENCE.STAFF) {
    return User.find({ role: USER_ROLES.STAFF, isActive: true }).select("_id role").lean();
  }

  if (notice.targetAudience === NOTICE_TARGET_AUDIENCE.PROVOST) {
    return User.find({ role: USER_ROLES.PROVOST, isActive: true }).select("_id role").lean();
  }

  if (notice.targetAudience === NOTICE_TARGET_AUDIENCE.SPECIFIC) {
    if (!Array.isArray(notice.targetUsers) || !notice.targetUsers.length) return [];
    return User.find({ _id: { $in: notice.targetUsers }, isActive: true }).select("_id role").lean();
  }

  return [];
}

async function maybeNotifyPublishedNotice(notice, actor, reason = "published") {
  if (!notice.isActive) return;
  const recipients = await resolveAudienceUsers(notice);
  if (!recipients.length) return;

  const type = notice.isUrgent ? "notice_urgent" : "notice_published";
  const title = notice.isUrgent ? "Urgent Notice" : "New Notice";
  const messagePrefix = reason === "activated" ? "A notice is now active" : "New notice published";

  await Promise.all(
    recipients.map((recipient) =>
      notificationService.createNotification({
        recipientUserId: recipient._id,
        actorUserId: actor.id,
        type,
        title,
        message: `${messagePrefix}: ${notice.title}.`,
        link:
          recipient.role === USER_ROLES.STAFF
            ? `/staff/notices/${notice._id}`
            : recipient.role === USER_ROLES.PROVOST
              ? `/provost/notices/${notice._id}`
              : `/student/notices/${notice._id}`,
        entityType: "Notice",
        entityId: notice._id.toString(),
      })
    )
  );
}

export const noticeService = {
  async createNotice(actor, payload) {
    const applicableRooms = normalizeObjectIdArray(payload.applicableRooms);
    const targetUsers = normalizeObjectIdArray(payload.targetUsers);
    await Promise.all([ensureRoomsExist(applicableRooms), ensureTargetUsersExist(targetUsers)]);

    const notice = await Notice.create({
      title: normalizeString(payload.title),
      content: normalizeString(payload.content),
      category: payload.category,
      publishedBy: actor.id,
      attachments: normalizeAttachments(payload.attachments),
      targetAudience: payload.targetAudience,
      targetUsers,
      applicableRooms,
      isUrgent: Boolean(payload.isUrgent),
      publishedDate: payload.publishedDate || new Date(),
      expiryDate: payload.expiryDate || null,
      isActive: payload.isActive ?? true,
    });

    await maybeNotifyPublishedNotice(notice, actor, "published");
    const populated = await populateNoticeById(notice._id);
    return sanitizeNotice(populated);
  },

  async updateNotice(noticeId, actor, payload) {
    const notice = await populateNoticeById(noticeId);

    if (payload.title !== undefined) notice.title = normalizeString(payload.title);
    if (payload.content !== undefined) notice.content = normalizeString(payload.content);
    if (payload.category !== undefined) notice.category = payload.category;
    if (payload.attachments !== undefined) notice.attachments = normalizeAttachments(payload.attachments);
    if (payload.targetAudience !== undefined) notice.targetAudience = payload.targetAudience;
    if (payload.isUrgent !== undefined) notice.isUrgent = Boolean(payload.isUrgent);
    if (payload.expiryDate !== undefined) notice.expiryDate = payload.expiryDate || null;
    if (payload.isActive !== undefined) notice.isActive = Boolean(payload.isActive);

    if (payload.targetUsers !== undefined) {
      const targetUsers = normalizeObjectIdArray(payload.targetUsers);
      await ensureTargetUsersExist(targetUsers);
      notice.targetUsers = targetUsers;
    }

    if (payload.applicableRooms !== undefined) {
      const applicableRooms = normalizeObjectIdArray(payload.applicableRooms);
      await ensureRoomsExist(applicableRooms);
      notice.applicableRooms = applicableRooms;
    }

    await notice.save();

    if (payload.isActive === true) {
      await maybeNotifyPublishedNotice(notice, actor, "activated");
    }

    const refreshed = await populateNoticeById(notice._id);
    return sanitizeNotice(refreshed);
  },

  async publishNotice(noticeId, actor) {
    const notice = await populateNoticeById(noticeId);
    notice.isActive = true;
    notice.publishedDate = new Date();
    await notice.save();

    await maybeNotifyPublishedNotice(notice, actor, "published");
    const refreshed = await populateNoticeById(notice._id);
    return sanitizeNotice(refreshed);
  },

  async setNoticeActive(noticeId, actor, payload) {
    const notice = await populateNoticeById(noticeId);
    notice.isActive = Boolean(payload.isActive);
    if (notice.isActive) {
      notice.publishedDate = notice.publishedDate || new Date();
    }
    await notice.save();

    if (notice.isActive) {
      await maybeNotifyPublishedNotice(notice, actor, "activated");
    }
    const refreshed = await populateNoticeById(notice._id);
    return sanitizeNotice(refreshed);
  },

  async listNotices(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const filters = {};

    if (query.category) filters.category = query.category;
    if (query.targetAudience) filters.targetAudience = query.targetAudience;
    if (typeof query.isActive === "boolean") filters.isActive = query.isActive;
    if (typeof query.isUrgent === "boolean") filters.isUrgent = query.isUrgent;

    if (!query.includeExpired) {
      const now = new Date();
      filters.$and = [
        { $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }] },
      ];
    }

    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), "i");
      filters.$or = [{ title: regex }, { content: regex }];
    }

    const [items, total, grouped] = await Promise.all([
      Notice.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("publishedBy", userProjection)
        .populate("targetUsers", userProjection)
        .populate("applicableRooms", roomProjection),
      Notice.countDocuments(filters),
      Notice.aggregate([
        { $match: filters },
        {
          $group: {
            _id: { isActive: "$isActive", isUrgent: "$isUrgent" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      items: items.map((entry) => sanitizeNotice(entry)),
      summary: buildNoticeSummary(grouped),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "publishedDate",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getNoticeById(noticeId) {
    const notice = await populateNoticeById(noticeId);
    return sanitizeNotice(notice);
  },

  async listMyNotices(actor, query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sort = normalizeSortStage(query.sortBy, query.sortOrder);
    const conditions = [buildBasePublicFilter(), buildVisibilityAudienceFilter(actor)];

    if (query.category) conditions.push({ category: query.category });
    if (typeof query.isUrgent === "boolean") conditions.push({ isUrgent: query.isUrgent });

    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), "i");
      conditions.push({ $or: [{ title: regex }, { content: regex }] });
    }

    const filters = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const [items, total] = await Promise.all([
      Notice.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("publishedBy", userProjection)
        .populate("targetUsers", userProjection)
        .populate("applicableRooms", roomProjection),
      Notice.countDocuments(filters),
    ]);

    return {
      items: items.map((entry) => sanitizeNotice(entry)),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortBy: query.sortBy || "publishedDate",
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getMyNoticeById(actor, noticeId) {
    const notice = await populateNoticeById(noticeId);
    ensureNoticeVisibilityForActor(notice, actor);

    if (actor.role !== USER_ROLES.PROVOST) {
      await Notice.updateOne({ _id: notice._id }, { $inc: { views: 1 } });
      notice.views = Number(notice.views || 0) + 1;
    }

    return sanitizeNotice(notice);
  },
};
