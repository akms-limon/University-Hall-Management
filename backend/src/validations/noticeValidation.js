import { z } from "zod";
import {
  NOTICE_CATEGORY,
  NOTICE_TARGET_AUDIENCE,
} from "../models/Notice.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const categoryEnum = z.enum(Object.values(NOTICE_CATEGORY));
const targetAudienceEnum = z.enum(Object.values(NOTICE_TARGET_AUDIENCE));

const trimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

export const noticeIdParamSchema = z.object({
  params: z.object({
    noticeId: z.string().trim().regex(objectIdPattern, "Invalid notice id"),
  }),
});

const baseNoticePayloadSchema = z.object({
  title: trimmedString("Title", 4, 220),
  content: trimmedString("Content", 12, 8000),
  category: categoryEnum.optional(),
  attachments: z.array(trimmedString("Attachment", 2, 500)).max(20, "Attachments cannot exceed 20 items").optional(),
  targetAudience: targetAudienceEnum,
  targetUsers: z.array(z.string().trim().regex(objectIdPattern, "Invalid target user id")).max(200).optional(),
  applicableRooms: z.array(z.string().trim().regex(objectIdPattern, "Invalid room id")).max(200).optional(),
  isUrgent: z.boolean().optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

const noticePayloadSchema = baseNoticePayloadSchema
  .refine(
    (value) =>
      value.targetAudience !== NOTICE_TARGET_AUDIENCE.SPECIFIC ||
      (Array.isArray(value.targetUsers) && value.targetUsers.length > 0),
    {
      message: "targetUsers is required when targetAudience is specific",
      path: ["targetUsers"],
    }
  );

export const createNoticeSchema = z.object({
  body: noticePayloadSchema,
});

export const updateNoticeSchema = z.object({
  params: z.object({
    noticeId: z.string().trim().regex(objectIdPattern, "Invalid notice id"),
  }),
  body: baseNoticePayloadSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    })
    .refine(
      (value) =>
        value.targetAudience !== NOTICE_TARGET_AUDIENCE.SPECIFIC ||
        (Array.isArray(value.targetUsers) && value.targetUsers.length > 0),
      {
        message: "targetUsers is required when targetAudience is specific",
        path: ["targetUsers"],
      }
    ),
});

export const setNoticeActiveSchema = z.object({
  params: z.object({
    noticeId: z.string().trim().regex(objectIdPattern, "Invalid notice id"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const listNoticesSchema = z.object({
  query: z.object({
    search: z.string().trim().max(160, "Search query is too long").optional(),
    category: categoryEnum.optional(),
    targetAudience: targetAudienceEnum.optional(),
    isActive: booleanFromQuery.optional(),
    isUrgent: booleanFromQuery.optional(),
    includeExpired: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "publishedDate", "expiryDate", "views", "title"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const listMyNoticesSchema = z.object({
  query: z.object({
    search: z.string().trim().max(160, "Search query is too long").optional(),
    category: categoryEnum.optional(),
    isUrgent: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["publishedDate", "createdAt", "updatedAt", "expiryDate", "views", "title"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});
