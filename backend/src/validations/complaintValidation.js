import { z } from "zod";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_SEVERITY,
  COMPLAINT_STATUS,
} from "../models/Complaint.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const categoryEnum = z.enum(Object.values(COMPLAINT_CATEGORIES));
const severityEnum = z.enum(Object.values(COMPLAINT_SEVERITY));
const statusEnum = z.enum(Object.values(COMPLAINT_STATUS));

const trimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmed = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return value;
}, z.boolean());

export const complaintIdParamSchema = z.object({
  params: z.object({
    complaintId: z.string().trim().regex(objectIdPattern, "Invalid complaint id"),
  }),
});

export const createComplaintSchema = z.object({
  body: z.object({
    title: trimmedString("Title", 4, 160),
    description: trimmedString("Description", 12, 4000),
    category: categoryEnum,
    severity: severityEnum.optional(),
    attachments: z
      .array(trimmedString("Attachment", 2, 500))
      .max(10, "Attachments cannot exceed 10 items")
      .optional(),
  }),
});

export const listMyComplaintsSchema = z.object({
  query: z.object({
    status: statusEnum.optional(),
    category: categoryEnum.optional(),
    severity: severityEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "severity", "category"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const addComplaintFeedbackSchema = z.object({
  params: z.object({
    complaintId: z.string().trim().regex(objectIdPattern, "Invalid complaint id"),
  }),
  body: z.object({
    feedback: optionalTrimmed("Feedback", 1200),
    rating: z.coerce.number().min(0, "Rating cannot be negative").max(5, "Rating cannot exceed 5").optional(),
  }),
});

export const listAssignedComplaintsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    status: statusEnum.optional(),
    category: categoryEnum.optional(),
    severity: severityEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "severity", "category"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const updateAssignedComplaintSchema = z.object({
  params: z.object({
    complaintId: z.string().trim().regex(objectIdPattern, "Invalid complaint id"),
  }),
  body: z
    .object({
      status: z.enum([COMPLAINT_STATUS.IN_PROGRESS, COMPLAINT_STATUS.RESOLVED]).optional(),
      resolution: optionalTrimmed("Resolution", 2000),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    })
    .refine((value) => value.status !== COMPLAINT_STATUS.RESOLVED || Boolean(value.resolution?.trim()), {
      message: "Resolution is required when marking a complaint as resolved",
      path: ["resolution"],
    }),
});

export const listComplaintsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    category: categoryEnum.optional(),
    severity: severityEnum.optional(),
    status: statusEnum.optional(),
    assignedTo: z.string().trim().regex(objectIdPattern, "Invalid assigned staff id").optional(),
    isAssigned: booleanFromQuery.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "severity", "category"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const assignComplaintSchema = z.object({
  params: z.object({
    complaintId: z.string().trim().regex(objectIdPattern, "Invalid complaint id"),
  }),
  body: z.object({
    staffId: z.string().trim().regex(objectIdPattern, "Invalid staff id"),
  }),
});

export const updateComplaintStatusSchema = z.object({
  params: z.object({
    complaintId: z.string().trim().regex(objectIdPattern, "Invalid complaint id"),
  }),
  body: z.object({
    status: statusEnum,
    resolution: optionalTrimmed("Resolution", 2000),
  }),
});
