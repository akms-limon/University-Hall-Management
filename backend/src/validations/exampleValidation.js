import { z } from "zod";

export const protectedExampleQuerySchema = z.object({
  query: z.object({
    includeMeta: z.coerce.boolean().optional(),
  }),
});

