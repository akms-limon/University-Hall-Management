import { sanitizeStaff } from "./sanitizeStaff.js";
import { sanitizeStudent } from "./sanitizeStudent.js";

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function sanitizeStudentRef(student) {
  if (!student) {
    return null;
  }

  if (typeof student === "object") {
    return sanitizeStudent(student);
  }

  return {
    id: toNullableString(student),
    userId: null,
    user: null,
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
  };
}

export function sanitizeComplaint(complaintDocument) {
  const complaint = complaintDocument.toObject ? complaintDocument.toObject() : complaintDocument;

  return {
    id: complaint._id?.toString?.() || complaint.id,
    student: sanitizeStudentRef(complaint.student),
    title: complaint.title || "",
    description: complaint.description || "",
    category: complaint.category || "other",
    severity: complaint.severity || "medium",
    attachments: Array.isArray(complaint.attachments) ? complaint.attachments : [],
    status: complaint.status || "open",
    assignedTo: sanitizeStaffRef(complaint.assignedTo),
    resolution: complaint.resolution || "",
    resolutionDate: complaint.resolutionDate || null,
    feedback: complaint.feedback || "",
    rating: Number.isFinite(complaint.rating) ? complaint.rating : null,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}
