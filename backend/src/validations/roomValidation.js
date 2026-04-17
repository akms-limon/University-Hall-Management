import { z } from "zod";
import { ROOM_STATUS } from "../models/Room.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const statusEnum = z.enum(Object.values(ROOM_STATUS));

const nonEmptyTrimmedString = (label, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const optionalStringList = (label, maxItems = 20, maxLen = 120) =>
  z
    .array(nonEmptyTrimmedString(label, 1, maxLen))
    .max(maxItems, `${label} cannot exceed ${maxItems} items`)
    .optional();

const optionalObjectIdList = z
  .array(z.string().trim().regex(objectIdPattern, "Occupant id must be valid"))
  .max(20, "Occupants cannot exceed 20 records")
  .optional();

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return value;
}, z.boolean());

export const createRoomSchema = z.object({
  body: z.object({
    roomNumber: nonEmptyTrimmedString("Room number", 1, 40),
    floor: z.coerce.number().int().min(0, "Floor cannot be negative").max(100, "Floor is too high"),
    wing: nonEmptyTrimmedString("Wing", 1, 80),
    capacity: z.coerce
      .number()
      .int()
      .min(1, "Capacity must be at least 1")
      .max(20, "Capacity is too high"),
    occupants: optionalObjectIdList,
    status: statusEnum.optional(),
    maintenanceNotes: optionalTrimmedString("Maintenance notes", 1200),
    lastCleaned: z.union([z.coerce.date(), z.null()]).optional(),
    features: optionalStringList("Feature", 20, 120),
    amenities: optionalStringList("Amenity", 20, 120),
    isActive: z.boolean().optional(),
  }),
});

export const listRoomsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(80, "Search query is too long").optional(),
    floor: z.coerce.number().int().min(0).max(100).optional(),
    wing: z.string().trim().max(80, "Wing is too long").optional(),
    status: statusEnum.optional(),
    isActive: booleanFromQuery.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "roomNumber",
        "floor",
        "wing",
        "capacity",
        "status",
        "lastCleaned",
      ])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const listPublicRoomsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(80, "Search query is too long").optional(),
    floor: z.coerce.number().int().min(0).max(100).optional(),
    wing: z.string().trim().max(80, "Wing is too long").optional(),
    status: statusEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["roomNumber", "floor", "wing", "capacity", "status", "lastCleaned"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const roomIdParamSchema = z.object({
  params: z.object({
    roomId: z.string().trim().regex(objectIdPattern, "Invalid room id"),
  }),
});

export const updateRoomSchema = z.object({
  params: z.object({
    roomId: z.string().trim().regex(objectIdPattern, "Invalid room id"),
  }),
  body: z
    .object({
      roomNumber: z.string().trim().max(40, "Room number must be at most 40 characters").optional(),
      floor: z.coerce.number().int().min(0).max(100).optional(),
      wing: z.string().trim().max(80, "Wing must be at most 80 characters").optional(),
      capacity: z.coerce.number().int().min(1).max(20).optional(),
      occupants: optionalObjectIdList,
      status: statusEnum.optional(),
      maintenanceNotes: optionalTrimmedString("Maintenance notes", 1200),
      lastCleaned: z.union([z.coerce.date(), z.null()]).optional(),
      features: optionalStringList("Feature", 20, 120),
      amenities: optionalStringList("Amenity", 20, 120),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    }),
});

export const updateRoomStatusSchema = z.object({
  params: z.object({
    roomId: z.string().trim().regex(objectIdPattern, "Invalid room id"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});
