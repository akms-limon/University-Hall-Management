import { sanitizeRoom } from "./sanitizeRoom.js";
import { sanitizeStaff } from "./sanitizeStaff.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
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
  };
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

export function sanitizeTask(taskDocument) {
  const task = taskDocument.toObject ? taskDocument.toObject() : taskDocument;

  return {
    id: task._id?.toString?.() || task.id,
    title: task.title || "",
    description: task.description || "",
    assignedTo: sanitizeStaffRef(task.assignedTo),
    room: sanitizeRoomRef(task.room),
    taskType: task.taskType || "other",
    priority: task.priority || "medium",
    status: task.status || "pending",
    dueDate: task.dueDate || null,
    completionDate: task.completionDate || null,
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    completionNotes: task.completionNotes || "",
    completionPhotos: Array.isArray(task.completionPhotos) ? task.completionPhotos : [],
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

