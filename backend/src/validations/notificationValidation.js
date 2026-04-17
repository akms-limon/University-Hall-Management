import { z } from "zod";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return value;
}, z.boolean());

export const listNotificationsSchema = z.object({
  query: z.object({
    unreadOnly: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    notificationId: z.string().trim().regex(objectIdPattern, "Invalid notification id"),
  }),
});
