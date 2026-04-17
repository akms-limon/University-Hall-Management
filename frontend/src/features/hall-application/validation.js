import { z } from "zod";

const phonePattern = /^[0-9+\-()\s]+$/;
const optionalPhonePattern = /^[0-9+\-()\s]*$/;

const requiredTrimmedString = (label, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

const requiredPhoneString = (label) =>
  z
    .string()
    .trim()
    .min(8, `${label} must be at least 8 characters`)
    .max(20, `${label} must be at most 20 characters`)
    .regex(phonePattern, `${label} contains invalid characters`);

const optionalPhoneString = (label) =>
  z
    .string()
    .trim()
    .max(20, `${label} must be at most 20 characters`)
    .regex(optionalPhonePattern, `${label} contains invalid characters`);

export const hallApplicationFormSchema = z.object({
  registrationNumber: requiredTrimmedString("Registration number", 2, 60),
  department: requiredTrimmedString("Department", 2, 120),
  semester: z.coerce.number().int().min(1, "Semester must be at least 1").max(20, "Semester is too high"),
  contactPhone: optionalPhoneString("Contact phone"),
  emergencyContactName: requiredTrimmedString("Emergency contact name", 2, 120),
  emergencyContactPhone: requiredPhoneString("Emergency contact phone"),
  emergencyContactRelation: requiredTrimmedString("Emergency contact relation", 2, 80),
  reason: requiredTrimmedString("Application reason", 20, 3000),
  attachmentsText: optionalTrimmedString("Attachments", 2000),
});

export const reviewNoteSchema = z.object({
  reviewNote: optionalTrimmedString("Review note", 1200),
});

export const meetingScheduleSchema = z.object({
  meetingDate: z
    .string()
    .min(1, "Meeting date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Meeting date is invalid"),
  meetingNote: optionalTrimmedString("Meeting note", 1200),
});

export const approveSchema = z.object({
  approvalNote: optionalTrimmedString("Approval note", 1200),
});

export const rejectSchema = z.object({
  rejectionReason: requiredTrimmedString("Rejection reason", 4, 1200),
});

export const waitlistSchema = z.object({
  reviewNote: optionalTrimmedString("Review note", 1200),
});

function parseTextList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildHallApplicationPayload(values, requestType = "new_room_request") {
  return {
    registrationNumber: values.registrationNumber.trim(),
    department: values.department.trim(),
    semester: Number(values.semester),
    contactPhone: values.contactPhone.trim(),
    emergencyContact: {
      name: values.emergencyContactName.trim(),
      phone: values.emergencyContactPhone.trim(),
      relation: values.emergencyContactRelation.trim(),
    },
    reason: values.reason.trim(),
    attachments: parseTextList(values.attachmentsText),
    requestType,
  };
}
