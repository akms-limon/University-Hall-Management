import { z } from "zod";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const phonePattern = /^[0-9+\-()\s]+$/;

const nonEmptyTrimmedString = (label, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 120) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const requiredPhoneString = (label) =>
  z
    .string()
    .trim()
    .min(8, `${label} must be at least 8 characters`)
    .max(20, `${label} must be at most 20 characters`)
    .regex(phonePattern, `${label} contains invalid characters`);

const optionalPhoneString = (label) => requiredPhoneString(label).optional();

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

export const createStaffSchema = z.object({
  body: z.object({
    name: nonEmptyTrimmedString("Name", 2, 120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
    phone: requiredPhoneString("Phone number"),
    staffId: nonEmptyTrimmedString("Staff ID", 2, 60),
    department: nonEmptyTrimmedString("Department", 2, 120),
    designation: nonEmptyTrimmedString("Designation", 2, 120),
    profilePhoto: optionalTrimmedString("Profile photo URL", 500),
    joiningDate: z.coerce.date({ invalid_type_error: "Joining date is required" }),
    isActive: z.boolean().optional(),
  }),
});

export const listStaffSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    department: z.string().trim().max(120, "Department is too long").optional(),
    designation: z.string().trim().max(120, "Designation is too long").optional(),
    isActive: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "name",
        "email",
        "staffId",
        "department",
        "designation",
        "joiningDate",
      ])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const staffRecordIdParamSchema = z.object({
  params: z.object({
    staffRecordId: z.string().trim().regex(objectIdPattern, "Invalid staff id"),
  }),
});

export const updateStaffSchema = z.object({
  params: z.object({
    staffRecordId: z.string().trim().regex(objectIdPattern, "Invalid staff id"),
  }),
  body: z
    .object({
      name: optionalTrimmedString("Name", 120),
      email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
      phone: optionalPhoneString("Phone number"),
      staffId: optionalTrimmedString("Staff ID", 60),
      department: optionalTrimmedString("Department", 120),
      designation: optionalTrimmedString("Designation", 120),
      profilePhoto: optionalTrimmedString("Profile photo URL", 500),
      joiningDate: z.coerce.date().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    }),
});

export const updateStaffStatusSchema = z.object({
  params: z.object({
    staffRecordId: z.string().trim().regex(objectIdPattern, "Invalid staff id"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const updateMyStaffProfileSchema = z.object({
  body: z
    .object({
      name: optionalTrimmedString("Name", 120),
      phone: optionalPhoneString("Phone number"),
      profilePhoto: optionalTrimmedString("Profile photo URL", 500),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one profile field is required",
    }),
});
