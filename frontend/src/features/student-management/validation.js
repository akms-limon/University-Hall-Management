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

const optionalPhoneString = (label) =>
  z
    .string()
    .trim()
    .max(20, `${label} must be at most 20 characters`)
    .regex(optionalPhonePattern, `${label} contains invalid characters`);

const requiredPhoneString = (label) =>
  z
    .string()
    .trim()
    .min(8, `${label} must be at least 8 characters`)
    .max(20, `${label} must be at most 20 characters`)
    .regex(phonePattern, `${label} contains invalid characters`);

const optionalSemester = z.union([
  z.coerce.number().int().min(1, "Semester must be at least 1").max(20, "Semester is too high"),
  z.literal(""),
]);

export const createStudentSchema = z.object({
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
  registrationNumber: optionalTrimmedString("Registration number", 60),
  department: requiredTrimmedString("Department", 2, 120),
  semester: z.coerce.number().int().min(1, "Semester must be at least 1").max(20, "Semester is too high"),
  profilePhoto: optionalTrimmedString("Profile photo", 500),
  allocationStatus: z.enum(["none", "pending", "requested", "allocated"]),
  isActive: z.boolean(),
  emergencyContactName: optionalTrimmedString("Emergency contact name", 120),
  emergencyContactPhone: optionalPhoneString("Emergency contact phone"),
  emergencyContactRelation: optionalTrimmedString("Emergency contact relation", 80),
});

export const editStudentSchema = createStudentSchema.omit({
  password: true,
});

export const studentSelfProfileSchema = z.object({
  name: optionalTrimmedString("Name", 120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
  phone: optionalPhoneString("Phone number"),
  profilePhoto: optionalTrimmedString("Profile photo", 500),
  semester: optionalSemester,
  emergencyContactName: optionalTrimmedString("Emergency contact name", 120),
  emergencyContactPhone: optionalPhoneString("Emergency contact phone"),
  emergencyContactRelation: optionalTrimmedString("Emergency contact relation", 80),
});

function normalizeEmergencyContact(values) {
  const name = values.emergencyContactName.trim();
  const phone = values.emergencyContactPhone.trim();
  const relation = values.emergencyContactRelation.trim();

  if (!name && !phone && !relation) {
    return undefined;
  }

  return {
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
    ...(relation ? { relation } : {}),
  };
}

export function buildCreateStudentPayload(values) {
  const emergencyContact = normalizeEmergencyContact(values);

  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    phone: values.phone.trim(),
    registrationNumber: values.registrationNumber.trim(),
    department: values.department.trim(),
    semester: Number(values.semester),
    profilePhoto: values.profilePhoto.trim(),
    allocationStatus: values.allocationStatus,
    isActive: values.isActive,
    ...(emergencyContact ? { emergencyContact } : {}),
  };
}

export function buildEditStudentPayload(values) {
  const emergencyContact = normalizeEmergencyContact(values);

  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    registrationNumber: values.registrationNumber.trim(),
    department: values.department.trim(),
    semester: Number(values.semester),
    profilePhoto: values.profilePhoto.trim(),
    allocationStatus: values.allocationStatus,
    isActive: values.isActive,
    ...(emergencyContact ? { emergencyContact } : {}),
  };
}

export function buildSelfProfilePayload(values) {
  const payload = {};

  if (values.name.trim()) payload.name = values.name.trim();
  if (values.phone.trim()) payload.phone = values.phone.trim();
  if (values.profilePhoto.trim()) payload.profilePhoto = values.profilePhoto.trim();
  if (values.semester !== "") payload.semester = Number(values.semester);

  const emergencyContact = normalizeEmergencyContact(values);
  if (emergencyContact) payload.emergencyContact = emergencyContact;

  return payload;
}
