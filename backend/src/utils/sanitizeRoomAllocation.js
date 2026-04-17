import { sanitizeRoom } from "./sanitizeRoom.js";
import { sanitizeStudent } from "./sanitizeStudent.js";
import { sanitizeUser } from "./sanitizeUser.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function sanitizeStudentSnapshot(studentValue) {
  if (!studentValue || typeof studentValue !== "object") {
    return null;
  }

  return sanitizeStudent(studentValue);
}

function sanitizeRoomSnapshot(roomValue) {
  if (!roomValue || typeof roomValue !== "object") {
    return null;
  }

  return sanitizeRoom(roomValue);
}

export function sanitizeRoomAllocation(allocationDocument) {
  const allocation = allocationDocument?.toObject ? allocationDocument.toObject() : allocationDocument;
  const student = sanitizeStudentSnapshot(allocation.student);
  const room = sanitizeRoomSnapshot(allocation.room);
  const currentRoom = sanitizeRoomSnapshot(allocation.currentRoom);
  const approvedBy =
    allocation.approvedBy && typeof allocation.approvedBy === "object"
      ? sanitizeUser(allocation.approvedBy)
      : null;

  return {
    id: allocation._id?.toString?.() || allocation.id,
    studentId: student?.id || toNullableString(allocation.student),
    student,
    roomId: room?.id || toNullableString(allocation.room),
    room,
    currentRoomId: currentRoom?.id || toNullableString(allocation.currentRoom),
    currentRoom,
    currentRoomNumber: allocation.currentRoomNumber || "",
    requestType: allocation.requestType || "new_room_request",
    allocationDate: allocation.allocationDate || null,
    releaseDate: allocation.releaseDate || null,
    status: allocation.status || "pending",
    approvedById: approvedBy ? approvedBy.id : toNullableString(allocation.approvedBy),
    approvedBy,
    requestReason: allocation.requestReason || "",
    rejectionReason: allocation.rejectionReason || "",
    semester: Number.isFinite(allocation.semester) ? allocation.semester : null,
    allocationYear: Number.isFinite(allocation.allocationYear) ? allocation.allocationYear : null,
    createdAt: allocation.createdAt,
    updatedAt: allocation.updatedAt,
  };
}
