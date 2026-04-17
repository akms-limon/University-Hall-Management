import { sanitizeStaff } from "./sanitizeStaff.js";
import { sanitizeStudent } from "./sanitizeStudent.js";
import { sanitizeUser } from "./sanitizeUser.js";

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

function sanitizeSender(sender) {
  if (!sender) {
    return null;
  }

  if (typeof sender === "object") {
    return sanitizeUser(sender);
  }

  return {
    id: toNullableString(sender),
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

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.map((entry) => ({
    sender: sanitizeSender(entry?.sender),
    message: entry?.message || "",
    attachments: Array.isArray(entry?.attachments) ? entry.attachments : [],
    sentAt: entry?.sentAt || null,
  }));
}

export function sanitizeSupportTicket(ticketDocument) {
  const ticket = ticketDocument.toObject ? ticketDocument.toObject() : ticketDocument;

  return {
    id: ticket._id?.toString?.() || ticket.id,
    student: sanitizeStudentRef(ticket.student),
    subject: ticket.subject || "",
    description: ticket.description || "",
    category: ticket.category || "other",
    priority: ticket.priority || "medium",
    attachments: Array.isArray(ticket.attachments) ? ticket.attachments : [],
    status: ticket.status || "open",
    assignedTo: sanitizeStaffRef(ticket.assignedTo),
    resolution: ticket.resolution || "",
    resolutionDate: ticket.resolutionDate || null,
    messages: sanitizeMessages(ticket.messages),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}
