import { z } from "zod";

const requiredTrimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const noticeFormSchema = z
  .object({
    title: requiredTrimmedString("Title", 4, 220),
    content: requiredTrimmedString("Content", 12, 8000),
    category: z.enum(["announcement", "emergency", "maintenance", "event", "rule_update", "other"]),
    targetAudience: z.enum(["all", "students", "staff", "provost", "specific"]),
    targetUsersText: optionalTrimmedString("Target users", 2000),
    applicableRoomsText: optionalTrimmedString("Applicable rooms", 2000),
    isUrgent: z.boolean(),
    expiryDate: z.string().trim().optional(),
    attachmentsText: optionalTrimmedString("Attachments", 2000),
    isActive: z.boolean(),
  })
  .refine(
    (value) => value.targetAudience !== "specific" || Boolean(value.targetUsersText?.trim()),
    {
      message: "Target user ids are required for specific audience",
      path: ["targetUsersText"],
    }
  );

function parseCommaOrLineText(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildNoticePayload(values) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    category: values.category,
    targetAudience: values.targetAudience,
    targetUsers: parseCommaOrLineText(values.targetUsersText),
    applicableRooms: parseCommaOrLineText(values.applicableRoomsText),
    isUrgent: Boolean(values.isUrgent),
    expiryDate: values.expiryDate ? values.expiryDate : null,
    attachments: parseCommaOrLineText(values.attachmentsText),
    isActive: Boolean(values.isActive),
  };
}

