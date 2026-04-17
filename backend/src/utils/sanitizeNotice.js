import { sanitizeRoom } from "./sanitizeRoom.js";
import { sanitizeUser } from "./sanitizeUser.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function sanitizeUserRef(user) {
  if (!user) return null;

  if (typeof user === "object") {
    return sanitizeUser(user);
  }

  return {
    id: toNullableString(user),
    name: "",
    email: "",
    phone: "",
    profilePhoto: "",
    role: "",
    isEmailVerified: false,
    isActive: false,
    lastLogin: null,
    createdAt: null,
    updatedAt: null,
  };
}

function sanitizeRoomRef(room) {
  if (!room) return null;
  if (typeof room === "object") return sanitizeRoom(room);

  return {
    id: toNullableString(room),
    roomNumber: "",
    floor: null,
    wing: "",
    capacity: null,
    occupants: [],
    occupancyCount: 0,
    availableBeds: 0,
    status: "vacant",
    maintenanceNotes: "",
    lastCleaned: null,
    features: [],
    amenities: [],
    isActive: false,
    createdAt: null,
    updatedAt: null,
  };
}

export function sanitizeNotice(noticeDocument) {
  const notice = noticeDocument.toObject ? noticeDocument.toObject() : noticeDocument;
  return {
    id: notice._id?.toString?.() || notice.id,
    title: notice.title || "",
    content: notice.content || "",
    category: notice.category || "announcement",
    publishedBy: sanitizeUserRef(notice.publishedBy),
    attachments: Array.isArray(notice.attachments) ? notice.attachments : [],
    targetAudience: notice.targetAudience || "all",
    targetUsers: Array.isArray(notice.targetUsers)
      ? notice.targetUsers.map((entry) => sanitizeUserRef(entry)).filter(Boolean)
      : [],
    applicableRooms: Array.isArray(notice.applicableRooms)
      ? notice.applicableRooms.map((entry) => sanitizeRoomRef(entry)).filter(Boolean)
      : [],
    isUrgent: Boolean(notice.isUrgent),
    publishedDate: notice.publishedDate || null,
    expiryDate: notice.expiryDate || null,
    views: Number(notice.views || 0),
    isActive: Boolean(notice.isActive),
    createdAt: notice.createdAt,
    updatedAt: notice.updatedAt,
  };
}

