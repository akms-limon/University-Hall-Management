import { z } from "zod";

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

export const createImageRecordSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(160, "Title is too long"),
    description: z.string().trim().max(1200, "Description is too long").optional().default(""),
  }),
});

export const updateImageRecordSchema = z.object({
  params: z.object({
    imageId: z.string().trim().regex(objectIdPattern, "Invalid image record id"),
  }),
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(160, "Title is too long").optional(),
    description: z.string().trim().max(1200, "Description is too long").optional(),
  }),
});

export const imageRecordIdParamSchema = z.object({
  params: z.object({
    imageId: z.string().trim().regex(objectIdPattern, "Invalid image record id"),
  }),
});

export const listImageRecordsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(120).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "title"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});
