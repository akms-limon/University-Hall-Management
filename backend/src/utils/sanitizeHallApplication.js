import { sanitizeUser } from "./sanitizeUser.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
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

function sanitizeAttachments(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => String(value).trim()).filter(Boolean);
}

function sanitizeDesiredRoom(roomValue) {
  if (!roomValue || typeof roomValue !== "object") {
    return null;
  }

  const room = roomValue.toObject ? roomValue.toObject() : roomValue;
  return {
    id: room._id?.toString?.() || room.id || null,
    roomNumber: room.roomNumber || "",
    floor: Number.isFinite(room.floor) ? room.floor : null,
    wing: room.wing || "",
    status: room.status || "",
    isActive: room.isActive === undefined ? true : Boolean(room.isActive),
  };
}

function sanitizeStudentSnapshot(studentValue) {
  if (!studentValue || typeof studentValue !== "object") {
    return null;
  }

  const student = studentValue.toObject ? studentValue.toObject() : studentValue;
  const userCandidate = student.userId || student.user;
  const user = userCandidate && typeof userCandidate === "object" ? sanitizeUser(userCandidate) : null;
  const userId = user ? user.id : toNullableString(userCandidate);

  return {
    id: student._id?.toString?.() || student.id || null,
    userId,
    user,
    registrationNumber: student.registrationNumber || "",
    department: student.department || "",
    semester: Number.isFinite(student.semester) ? student.semester : null,
    profilePhoto: student.profilePhoto || "",
    isActive: student.isActive === undefined ? true : Boolean(student.isActive),
  };
}

export function sanitizeHallApplication(applicationDocument) {
  const application = applicationDocument.toObject ? applicationDocument.toObject() : applicationDocument;
  const student = sanitizeStudentSnapshot(application.student);
  const reviewedBy =
    application.reviewedBy && typeof application.reviewedBy === "object"
      ? sanitizeUser(application.reviewedBy)
      : null;

  return {
    id: application._id?.toString?.() || application.id,
    studentId: student?.id || toNullableString(application.student),
    student,
    registrationNumber: application.registrationNumber || "",
    department: application.department || "",
    semester: Number.isFinite(application.semester) ? application.semester : null,
    contactPhone: application.contactPhone || "",
    emergencyContact: sanitizeEmergencyContact(application.emergencyContact),
    reason: application.reason || "",
    requestType: application.requestType || "new_room_request",
    currentRoomNumber: application.currentRoomNumber || "",
    desiredRoomId: application.desiredRoom?._id?.toString?.() || toNullableString(application.desiredRoom),
    desiredRoom: sanitizeDesiredRoom(application.desiredRoom),
    desiredRoomNumber: application.desiredRoomNumber || "",
    attachments: sanitizeAttachments(application.attachments),
    status: application.status,
    reviewedById: reviewedBy ? reviewedBy.id : toNullableString(application.reviewedBy),
    reviewedBy,
    reviewNote: application.reviewNote || "",
    meetingDate: application.meetingDate || null,
    meetingNote: application.meetingNote || "",
    approvalNote: application.approvalNote || "",
    rejectionReason: application.rejectionReason || "",
    applicationDate: application.applicationDate || application.createdAt || null,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}
