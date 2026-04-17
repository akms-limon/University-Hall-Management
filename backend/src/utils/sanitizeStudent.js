import { sanitizeUser } from "./sanitizeUser.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function sanitizeCurrentRoom(value) {
  if (!value) return null;

  if (typeof value === "object") {
    if (value.roomNumber) return String(value.roomNumber);
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }

  return String(value);
}

function sanitizeEmergencyContact(contact) {
  return {
    name: contact?.name || "",
    phone: contact?.phone || "",
    relation: contact?.relation || "",
  };
}

export function sanitizeStudent(studentDocument) {
  const student = studentDocument.toObject ? studentDocument.toObject() : studentDocument;
  const user = student.userId && typeof student.userId === "object" ? sanitizeUser(student.userId) : null;
  const userId = user ? user.id : toNullableString(student.userId);

  return {
    id: student._id?.toString?.() || student.id,
    userId,
    user,
    registrationNumber: student.registrationNumber || "",
    department: student.department || "",
    semester: Number.isFinite(student.semester) ? student.semester : null,
    profilePhoto: student.profilePhoto || "",
    currentRoom: sanitizeCurrentRoom(student.currentRoom),
    balance: Number.isFinite(student.balance) ? student.balance : 0,
    emergencyContact: sanitizeEmergencyContact(student.emergencyContact),
    allocationStatus: student.allocationStatus || "none",
    isActive: Boolean(student.isActive),
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}
