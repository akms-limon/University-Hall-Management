import { sanitizeRoom } from "./sanitizeRoom.js";
import { sanitizeStaff } from "./sanitizeStaff.js";
import { sanitizeUser } from "./sanitizeUser.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function sanitizeRoomRef(room) {
  if (!room) {
    return null;
  }

  if (typeof room === "object") {
    return sanitizeRoom(room);
  }

  return {
    id: toNullableString(room),
  };
}

function sanitizeUserRef(user) {
  if (!user) {
    return null;
  }

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

function sanitizeStaffRef(staff) {
  if (!staff) {
    return null;
  }

  if (typeof staff === "object") {
    return sanitizeStaff(staff);
  }

  return {
    id: toNullableString(staff),
    userId: null,
    user: null,
    staffId: "",
    department: "",
    designation: "",
    profilePhoto: "",
    joiningDate: null,
    isActive: false,
    createdAt: null,
    updatedAt: null,
  };
}

function sanitizePhotos(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function sanitizeMaterials(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((entry) => ({
      name: String(entry?.name || "").trim(),
      quantity: Number(entry?.quantity) || 0,
      cost: Number(entry?.cost) || 0,
    }))
    .filter((entry) => entry.name.length > 0);
}

export function sanitizeMaintenance(maintenanceDocument) {
  const record = maintenanceDocument?.toObject
    ? maintenanceDocument.toObject()
    : maintenanceDocument;

  return {
    id: record?._id?.toString?.() || record?.id,
    room: sanitizeRoomRef(record?.room),
    issue: record?.issue || "",
    description: record?.description || "",
    category: record?.category || "other",
    severity: record?.severity || "medium",
    reportedBy: sanitizeUserRef(record?.reportedBy),
    assignedTo: sanitizeStaffRef(record?.assignedTo),
    status: record?.status || "reported",
    beforePhotos: sanitizePhotos(record?.beforePhotos),
    afterPhotos: sanitizePhotos(record?.afterPhotos),
    estimatedCost: Number.isFinite(record?.estimatedCost) ? record.estimatedCost : null,
    actualCost: Number.isFinite(record?.actualCost) ? record.actualCost : null,
    materialUsed: sanitizeMaterials(record?.materialUsed),
    workLog: record?.workLog || "",
    completionDate: record?.completionDate || null,
    invoiceDocument: record?.invoiceDocument || null,
    createdAt: record?.createdAt,
    updatedAt: record?.updatedAt,
  };
}
