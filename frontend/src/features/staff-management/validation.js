import { z } from "zod";

const phonePattern = /^[0-9+\-()\s]+$/;
const optionalPhonePattern = /^[0-9+\-()\s]*$/;

const requiredTrimmedString = (label, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 120) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

const requiredPhoneString = (label) =>
  z
    .string()
    .trim()
    .min(8, `${label} must be at least 8 characters`)
    .max(20, `${label} must be at most 20 characters`)
    .regex(phonePattern, `${label} contains invalid characters`);

const optionalPhoneString = (label) =>
  z
    .string()
    .trim()
    .max(20, `${label} must be at most 20 characters`)
    .regex(optionalPhonePattern, `${label} contains invalid characters`);

export const createStaffSchema = z.object({
  name: requiredTrimmedString("Name", 2, 120),
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
  staffId: requiredTrimmedString("Staff ID", 2, 60),
  department: requiredTrimmedString("Department", 2, 120),
  designation: requiredTrimmedString("Designation", 2, 120),
  profilePhoto: optionalTrimmedString("Profile photo", 500),
  joiningDate: z
    .string()
    .min(1, "Joining date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Joining date is invalid"),
  isActive: z.boolean(),
});

export const editStaffSchema = createStaffSchema.omit({
  password: true,
});

export const staffSelfProfileSchema = z.object({
  name: optionalTrimmedString("Name", 120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
  phone: optionalPhoneString("Phone number"),
  profilePhoto: optionalTrimmedString("Profile photo", 500),
});

export function buildCreateStaffPayload(values) {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    phone: values.phone.trim(),
    staffId: values.staffId.trim(),
    department: values.department.trim(),
    designation: values.designation.trim(),
    profilePhoto: values.profilePhoto.trim(),
    joiningDate: values.joiningDate,
    isActive: values.isActive,
  };
}

export function buildEditStaffPayload(values) {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    staffId: values.staffId.trim(),
    department: values.department.trim(),
    designation: values.designation.trim(),
    profilePhoto: values.profilePhoto.trim(),
    joiningDate: values.joiningDate,
    isActive: values.isActive,
  };
}

export function buildSelfStaffProfilePayload(values) {
  const payload = {};

  if (values.name.trim()) payload.name = values.name.trim();
  if (values.phone.trim()) payload.phone = values.phone.trim();
  if (values.profilePhoto.trim()) payload.profilePhoto = values.profilePhoto.trim();

  return payload;
}
