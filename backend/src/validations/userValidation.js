import { z } from "zod";

const phonePattern = /^[0-9+\-()\s]+$/;

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const updateMyUserProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, "Name must be at least 2 characters").max(120, "Name is too long").optional(),
      phone: z
        .string()
        .trim()
        .min(8, "Phone number must be at least 8 characters")
        .max(20, "Phone number must be at most 20 characters")
        .regex(phonePattern, "Phone number contains invalid characters")
        .optional(),
      profilePhoto: z.string().trim().max(500, "Profile photo URL is too long").optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one profile field is required",
    }),
});
