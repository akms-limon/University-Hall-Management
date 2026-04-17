import { z } from "zod";

export const singleFileMetaSchema = z.object({
  body: z.object({
    fileCategory: z.string().optional(),
  }),
});

export const multiFileMetaSchema = z.object({
  body: z.object({
    attachmentGroup: z.string().optional(),
  }),
});

