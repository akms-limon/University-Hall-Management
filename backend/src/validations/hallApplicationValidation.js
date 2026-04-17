import { z } from "zod";
import {
  HALL_APPLICATION_REQUEST_TYPE,
  HALL_APPLICATION_STATUS,
} from "../models/HallApplication.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const phonePattern = /^[0-9+\-()\s]+$/;
const optionalPhonePattern = /^[0-9+\-()\s]*$/;
const statusEnum = z.enum(Object.values(HALL_APPLICATION_STATUS));
const requestTypeEnum = z.enum(Object.values(HALL_APPLICATION_REQUEST_TYPE));

const nonEmptyTrimmedString = (label, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

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
    .regex(optionalPhonePattern, `${label} contains invalid characters`)
    .optional();

const attachmentSchema = z
  .array(nonEmptyTrimmedString("Attachment", 2, 500))
  .max(10, "Attachments cannot exceed 10 items")
  .optional();
const optionalObjectIdString = z
  .string()
  .trim()
  .regex(objectIdPattern, "Invalid room id")
  .optional();

const emergencyContactSchema = z.object({
  name: nonEmptyTrimmedString("Emergency contact name", 2, 120),
  phone: requiredPhoneString("Emergency contact phone"),
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

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return value;
}, z.boolean());

export const hallApplicationIdParamSchema = z.object({
  params: z.object({
    applicationId: z.string().trim().regex(objectIdPattern, "Invalid hall application id"),
  }),
});

export const submitHallApplicationSchema = z.object({
  body: z.object({
    registrationNumber: nonEmptyTrimmedString("Registration number", 2, 60),
    department: nonEmptyTrimmedString("Department", 2, 120),
    semester: z.coerce.number().int().min(1, "Semester must be at least 1").max(20, "Semester is too high"),
    contactPhone: optionalPhoneString("Contact phone"),
    emergencyContact: emergencyContactSchema,
    reason: nonEmptyTrimmedString("Application reason", 20, 3000),
    attachments: attachmentSchema,
    requestType: requestTypeEnum.optional().default(HALL_APPLICATION_REQUEST_TYPE.NEW_ROOM_REQUEST),
    desiredRoomId: optionalObjectIdString,
  }),
});

export const updateMyHallApplicationSchema = z.object({
  params: z.object({
    applicationId: z.string().trim().regex(objectIdPattern, "Invalid hall application id"),
  }),
  body: z
    .object({
      registrationNumber: optionalTrimmedString("Registration number", 60),
      department: optionalTrimmedString("Department", 120),
      semester: z.coerce.number().int().min(1).max(20).optional(),
      contactPhone: optionalPhoneString("Contact phone"),
      emergencyContact: emergencyContactUpdateSchema.optional(),
      reason: optionalTrimmedString("Application reason", 3000),
      attachments: attachmentSchema,
      desiredRoomId: optionalObjectIdString,
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    }),
});

export const listMyHallApplicationsSchema = z.object({
  query: z.object({
    status: statusEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["applicationDate", "createdAt", "updatedAt", "status"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const listHallApplicationsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    department: z.string().trim().max(120, "Department is too long").optional(),
    semester: z.coerce.number().int().min(1).max(20).optional(),
    status: statusEnum.optional(),
    requestType: requestTypeEnum.optional(),
    hasMeeting: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z
      .enum(["applicationDate", "createdAt", "updatedAt", "status", "department", "semester"])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const updateHallApplicationReviewSchema = z.object({
  params: z.object({
    applicationId: z.string().trim().regex(objectIdPattern, "Invalid hall application id"),
  }),
  body: z
    .object({
      reviewNote: optionalTrimmedString("Review note", 1200),
      meetingDate: z.union([z.coerce.date(), z.null()]).optional(),
      meetingNote: optionalTrimmedString("Meeting note", 1200),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one review field is required",
    }),
});

export const updateHallApplicationStatusSchema = z.object({
  params: z.object({
    applicationId: z.string().trim().regex(objectIdPattern, "Invalid hall application id"),
  }),
  body: z.object({
    status: statusEnum,
    reviewNote: optionalTrimmedString("Review note", 1200),
    meetingDate: z.coerce.date().optional(),
    meetingNote: optionalTrimmedString("Meeting note", 1200),
    approvalNote: optionalTrimmedString("Approval note", 1200),
    rejectionReason: optionalTrimmedString("Rejection reason", 1200),
  }),
});

export const scheduleMeetingSchema = z.object({
  params: z.object({
    applicationId: z.string().trim().regex(objectIdPattern, "Invalid hall application id"),
  }),
  body: z.object({
    meetingDate: z.coerce.date(),
    meetingNote: optionalTrimmedString("Meeting note", 1200),
  }),
});

export const approveApplicationSchema = z.object({
  params: z.object({
    applicationId: z.string().trim().regex(objectIdPattern, "Invalid hall application id"),
  }),
  body: z
    .object({
      approvalNote: optionalTrimmedString("Approval note", 1200),
    })
    .optional()
    .default({}),
});

export const rejectApplicationSchema = z.object({
  params: z.object({
    applicationId: z.string().trim().regex(objectIdPattern, "Invalid hall application id"),
  }),
  body: z.object({
    rejectionReason: nonEmptyTrimmedString("Rejection reason", 4, 1200),
  }),
});

export const waitlistApplicationSchema = z.object({
  params: z.object({
    applicationId: z.string().trim().regex(objectIdPattern, "Invalid hall application id"),
  }),
  body: z
    .object({
      reviewNote: optionalTrimmedString("Review note", 1200),
    })
    .optional()
    .default({}),
});
