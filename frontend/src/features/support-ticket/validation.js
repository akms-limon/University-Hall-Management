import { z } from "zod";

const requiredTrimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const supportTicketCreateSchema = z.object({
  subject: requiredTrimmedString("Subject", 4, 180),
  description: requiredTrimmedString("Description", 12, 4000),
  category: z.enum(["academic", "health", "personal", "financial", "technical", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  attachmentsText: optionalTrimmedString("Attachments", 2000),
});

export const supportTicketMessageSchema = z.object({
  message: requiredTrimmedString("Message", 1, 3000),
  attachmentsText: optionalTrimmedString("Attachments", 2000),
});

export const supportTicketStatusUpdateSchema = z
  .object({
    status: z.enum(["open", "in-progress", "resolved", "closed"]),
    resolution: optionalTrimmedString("Resolution note", 2000),
  })
  .refine((value) => value.status !== "resolved" || Boolean(value.resolution?.trim()), {
    message: "Resolution note is required for resolved status",
    path: ["resolution"],
  });

export const supportTicketStaffUpdateSchema = z
  .object({
    status: z.enum(["in-progress", "resolved"]).optional(),
    resolution: optionalTrimmedString("Resolution note", 2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one update is required",
  })
  .refine((value) => value.status !== "resolved" || Boolean(value.resolution?.trim()), {
    message: "Resolution note is required for resolved status",
    path: ["resolution"],
  });

function parseAttachments(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildCreateSupportTicketPayload(values) {
  return {
    subject: values.subject.trim(),
    description: values.description.trim(),
    category: values.category,
    priority: values.priority,
    attachments: parseAttachments(values.attachmentsText),
  };
}

export function buildSupportTicketMessagePayload(values) {
  return {
    message: values.message.trim(),
    attachments: parseAttachments(values.attachmentsText),
  };
}

