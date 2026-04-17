import { sanitizeUser } from "./sanitizeUser.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

export function sanitizeNotification(notificationDocument) {
  const notification = notificationDocument.toObject ? notificationDocument.toObject() : notificationDocument;
  const actor = notification.actor && typeof notification.actor === "object" ? sanitizeUser(notification.actor) : null;

  return {
    id: notification._id?.toString?.() || notification.id,
    recipientId: toNullableString(notification.recipient),
    actorId: actor ? actor.id : toNullableString(notification.actor),
    actor,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link || "",
    entityType: notification.entityType || "",
    entityId: notification.entityId || "",
    metadata: notification.metadata ?? null,
    isRead: Boolean(notification.isRead),
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}
