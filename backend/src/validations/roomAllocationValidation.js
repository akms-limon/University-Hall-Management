import { z } from "zod";
import { ROOM_ALLOCATION_REQUEST_TYPE, ROOM_ALLOCATION_STATUS } from "../models/RoomAllocation.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const statusEnum = z.enum(Object.values(ROOM_ALLOCATION_STATUS));
const requestTypeEnum = z.enum(Object.values(ROOM_ALLOCATION_REQUEST_TYPE));

const nonEmptyTrimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

export const createMyRoomAllocationSchema = z.object({
  body: z.object({
    roomId: z.string().trim().regex(objectIdPattern, "Room id is invalid"),
    requestType: requestTypeEnum.optional().default(ROOM_ALLOCATION_REQUEST_TYPE.NEW_ROOM_REQUEST),
    requestReason: optionalTrimmedString("Request reason", 2000),
    semester: z.coerce.number().int().min(1, "Semester must be at least 1").max(20, "Semester is too high"),
    allocationYear: z.coerce
      .number()
      .int()
      .min(2000, "Allocation year is invalid")
      .max(2200, "Allocation year is invalid"),
  }),
});

export const roomAllocationIdParamSchema = z.object({
  params: z.object({
    allocationId: z.string().trim().regex(objectIdPattern, "Allocation id is invalid"),
  }),
});

export const listMyRoomAllocationsSchema = z.object({
  query: z.object({
    status: statusEnum.optional(),
    requestType: requestTypeEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["allocationDate", "createdAt", "updatedAt", "status", "semester", "allocationYear"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const listRoomAllocationsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    roomId: z.string().trim().regex(objectIdPattern, "Room id is invalid").optional(),
    semester: z.coerce.number().int().min(1).max(20).optional(),
    allocationYear: z.coerce.number().int().min(2000).max(2200).optional(),
    status: statusEnum.optional(),
    requestType: requestTypeEnum.optional(),
    isActiveStudent: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z
      .enum(["allocationDate", "createdAt", "updatedAt", "status", "semester", "allocationYear"])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const approveRoomAllocationSchema = z.object({
  params: z.object({
    allocationId: z.string().trim().regex(objectIdPattern, "Allocation id is invalid"),
  }),
  body: z.object({
    roomId: z.string().trim().regex(objectIdPattern, "Room id is invalid"),
    note: optionalTrimmedString("Approval note", 300),
  }),
});

export const rejectRoomAllocationSchema = z.object({
  params: z.object({
    allocationId: z.string().trim().regex(objectIdPattern, "Allocation id is invalid"),
  }),
  body: z.object({
    rejectionReason: nonEmptyTrimmedString("Rejection reason", 4, 1200),
  }),
});

export const activateRoomAllocationSchema = z.object({
  params: z.object({
    allocationId: z.string().trim().regex(objectIdPattern, "Allocation id is invalid"),
  }),
  body: z
    .object({
      allocationDate: z.coerce.date().optional(),
    })
    .optional()
    .default({}),
});

export const completeRoomAllocationSchema = z.object({
  params: z.object({
    allocationId: z.string().trim().regex(objectIdPattern, "Allocation id is invalid"),
  }),
  body: z
    .object({
      releaseDate: z.coerce.date().optional(),
    })
    .optional()
    .default({}),
});

export const transferRoomAllocationSchema = z.object({
  params: z.object({
    allocationId: z.string().trim().regex(objectIdPattern, "Allocation id is invalid"),
  }),
  body: z.object({
    toRoomId: z.string().trim().regex(objectIdPattern, "Destination room id is invalid"),
    transferReason: optionalTrimmedString("Transfer reason", 1200),
    semester: z.coerce.number().int().min(1).max(20).optional(),
    allocationYear: z.coerce.number().int().min(2000).max(2200).optional(),
  }),
});
