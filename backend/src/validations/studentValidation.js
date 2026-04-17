import { z } from "zod";
import { STUDENT_ALLOCATION_STATUS } from "../models/Student.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const phonePattern = /^[0-9+\-()\s]+$/;
const allocationStatusEnum = z.enum(Object.values(STUDENT_ALLOCATION_STATUS));

const nonEmptyTrimmedString = (label, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 120) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const optionalPhoneString = (label) =>
  z
    .string()
    .trim()
    .min(8, `${label} must be at least 8 characters`)
    .max(20, `${label} must be at most 20 characters`)
    .regex(phonePattern, `${label} contains invalid characters`)
    .optional();

const emergencyContactSchema = z.object({
  name: nonEmptyTrimmedString("Emergency contact name", 2, 120),
  phone: nonEmptyTrimmedString("Emergency contact phone", 8, 20).regex(
    phonePattern,
    "Emergency contact phone contains invalid characters"
  ),
  relation: nonEmptyTrimmedString("Emergency contact relation", 2, 80),
});

const emergencyContactUpdateSchema = z
  .object({
    name: optionalTrimmedString("Emergency contact name", 120),
    phone: optionalPhoneString("Emergency contact phone"),
    relation: optionalTrimmedString("Emergency contact relation", 80),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one emergency contact field is required",
  });

const optionalObjectIdOrNull = z
  .union([
    z.string().trim().regex(objectIdPattern, "Current room must be a valid id"),
    z.null(),
  ])
  .optional();

const optionalProfilePhoto = z
  .string()
  .trim()
  .max(500, "Profile photo URL must be at most 500 characters")
  .optional();

const optionalRegistrationNumber = z
  .string()
  .trim()
  .max(60, "Registration number must be at most 60 characters")
  .optional();

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

export const createStudentSchema = z.object({
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
    phone: nonEmptyTrimmedString("Phone number", 8, 20).regex(
      phonePattern,
      "Phone number contains invalid characters"
    ),
    registrationNumber: optionalRegistrationNumber,
    department: nonEmptyTrimmedString("Department", 2, 120),
    semester: z.coerce.number().int().min(1, "Semester must be at least 1").max(20, "Semester is too high"),
    profilePhoto: optionalProfilePhoto,
    currentRoom: optionalObjectIdOrNull,
    balance: z.coerce.number().min(0, "Balance cannot be negative").optional(),
    emergencyContact: emergencyContactSchema.optional(),
    allocationStatus: allocationStatusEnum.optional(),
    isActive: z.boolean().optional(),
  }),
});

export const listStudentsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    department: z.string().trim().max(120, "Department is too long").optional(),
    semester: z.coerce.number().int().min(1).max(20).optional(),
    allocationStatus: allocationStatusEnum.optional(),
    isActive: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "name",
        "email",
        "registrationNumber",
        "department",
        "semester",
        "allocationStatus",
        "balance",
      ])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const studentIdParamSchema = z.object({
  params: z.object({
    studentId: z.string().trim().regex(objectIdPattern, "Invalid student id"),
  }),
});

export const updateStudentSchema = z.object({
  params: z.object({
    studentId: z.string().trim().regex(objectIdPattern, "Invalid student id"),
  }),
  body: z
    .object({
      name: optionalTrimmedString("Name", 120),
      email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
      phone: optionalPhoneString("Phone number"),
      registrationNumber: optionalRegistrationNumber,
      department: optionalTrimmedString("Department", 120),
      semester: z.coerce.number().int().min(1).max(20).optional(),
      profilePhoto: optionalProfilePhoto,
      currentRoom: optionalObjectIdOrNull,
      balance: z.coerce.number().min(0, "Balance cannot be negative").optional(),
      emergencyContact: emergencyContactUpdateSchema.optional(),
      allocationStatus: allocationStatusEnum.optional(),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    }),
});

export const updateStudentStatusSchema = z.object({
  params: z.object({
    studentId: z.string().trim().regex(objectIdPattern, "Invalid student id"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const updateMyStudentProfileSchema = z.object({
  body: z
    .object({
      name: optionalTrimmedString("Name", 120),
      phone: optionalPhoneString("Phone number"),
      profilePhoto: optionalProfilePhoto,
      semester: z.coerce.number().int().min(1).max(20).optional(),
      emergencyContact: emergencyContactUpdateSchema.optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one profile field is required",
    }),
});
