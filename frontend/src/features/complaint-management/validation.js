import { z } from "zod";

const requiredTrimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) => z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const complaintCreateSchema = z.object({
  title: requiredTrimmedString("Title", 4, 160),
  description: requiredTrimmedString("Description", 12, 4000),
  category: z.enum(["maintenance", "food_quality", "room_condition", "roommate", "facility", "hygiene", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  attachmentsText: optionalTrimmedString("Attachments", 2000),
});

export const complaintFeedbackSchema = z
  .object({
    feedback: optionalTrimmedString("Feedback", 1200),
    rating: z.coerce.number().min(0, "Rating cannot be negative").max(5, "Rating cannot exceed 5").optional(),
  })
  .refine((value) => Boolean(value.feedback?.trim() || value.rating !== undefined), {
    message: "Feedback or rating is required",
  });

export const complaintStatusUpdateSchema = z
  .object({
    status: z.enum(["open", "in-progress", "resolved", "closed"]),
    resolution: optionalTrimmedString("Resolution note", 2000),
  })
  .refine((value) => value.status !== "resolved" || Boolean(value.resolution?.trim()), {
    message: "Resolution note is required for resolved status",
    path: ["resolution"],
  });

export const complaintStaffUpdateSchema = z
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

export function buildCreateComplaintPayload(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    severity: values.severity,
    attachments: String(values.attachmentsText || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
  };
}
