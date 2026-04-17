import { StatusCodes } from "http-status-codes";
import { roleList } from "../constants/roles.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { sanitizeNotification } from "../utils/sanitizeNotification.js";

const actorProjection = "name email phone role profilePhoto isActive";

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeSortOrder(sortOrder = "desc") {
  return sortOrder === "asc" ? 1 : -1;
}

async function loadNotificationForRecipient(notificationId, recipientId) {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: recipientId,
  }).populate("actor", actorProjection);

  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Notification not found");
  }

  return notification;
}

export const notificationService = {
  async createNotification(payload) {
    const notification = await Notification.create({
      recipient: payload.recipientUserId,
      actor: payload.actorUserId || null,
      type: normalizeString(payload.type) || "general",
      title: normalizeString(payload.title) || "Notification",
      message: normalizeString(payload.message),
      link: normalizeString(payload.link),
      entityType: normalizeString(payload.entityType),
      entityId: normalizeString(payload.entityId),
      metadata: payload.metadata ?? null,
    });

    return notification;
  },

  async createNotificationsForUsers(userIds, payload) {
    const normalizedUserIds = Array.from(
      new Set((Array.isArray(userIds) ? userIds : []).map((value) => value?.toString?.() || String(value)))
    ).filter(Boolean);

    if (!normalizedUserIds.length) {
      return { createdCount: 0 };
    }

    const docs = normalizedUserIds.map((recipientUserId) => ({
      recipient: recipientUserId,
      actor: payload.actorUserId || null,
      type: normalizeString(payload.type) || "general",
      title: normalizeString(payload.title) || "Notification",
      message: normalizeString(payload.message),
      link: normalizeString(payload.link),
      entityType: normalizeString(payload.entityType),
      entityId: normalizeString(payload.entityId),
      metadata: payload.metadata ?? null,
    }));

    await Notification.insertMany(docs);
    return { createdCount: docs.length };
  },

  async notifyRole(role, payload) {
    if (!roleList.includes(role)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid role for notification");
    }

    const users = await User.find({
      role,
      isActive: true,
    })
      .select("_id")
      .lean();

    return this.createNotificationsForUsers(
      users.map((user) => user._id),
      payload
    );
  },

  async listMyNotifications(actor, query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const sortDirection = normalizeSortOrder(query.sortOrder);
    const filters = {
      recipient: actor.id,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filters)
        .sort({ createdAt: sortDirection, _id: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate("actor", actorProjection),
      Notification.countDocuments(filters),
      Notification.countDocuments({
        recipient: actor.id,
        isRead: false,
      }),
    ]);

    return {
      items: items.map((entry) => sanitizeNotification(entry)),
      summary: {
        unreadCount,
      },
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        sortOrder: query.sortOrder || "desc",
      },
    };
  },

  async getMyUnreadCount(actor) {
    const unreadCount = await Notification.countDocuments({
      recipient: actor.id,
      isRead: false,
    });

    return { unreadCount };
  },

  async markMyNotificationRead(actor, notificationId) {
    const notification = await loadNotificationForRecipient(notificationId, actor.id);
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    const refreshed = await loadNotificationForRecipient(notificationId, actor.id);
    return sanitizeNotification(refreshed);
  },

  async markAllMyNotificationsRead(actor) {
    const now = new Date();
    const result = await Notification.updateMany(
      {
        recipient: actor.id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: now,
        },
      }
    );

    return {
      updatedCount: result.modifiedCount || 0,
    };
  },
};
