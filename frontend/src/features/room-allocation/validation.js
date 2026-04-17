import { z } from "zod";

const requiredTrimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const roomAllocationRequestSchema = z.object({
  roomId: requiredTrimmedString("Room", 1, 48),
  requestType: z.enum(["new_room_request", "transfer_request"]).optional(),
  requestReason: optionalTrimmedString("Request reason", 2000),
  semester: z.coerce.number().int().min(1, "Semester must be at least 1").max(20, "Semester is too high"),
  allocationYear: z.coerce
    .number()
    .int()
    .min(2000, "Allocation year is invalid")
    .max(2200, "Allocation year is invalid"),
});

export const rejectAllocationSchema = z.object({
  rejectionReason: requiredTrimmedString("Rejection reason", 4, 1200),
});

export const activateAllocationSchema = z.object({
  allocationDate: z
    .string()
    .trim()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Allocation date is invalid"),
});

export const completeAllocationSchema = z.object({
  releaseDate: z
    .string()
    .trim()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Release date is invalid"),
});

export const transferAllocationSchema = z.object({
  toRoomId: requiredTrimmedString("Destination room", 1, 48),
  transferReason: optionalTrimmedString("Transfer reason", 1200),
  semester: z.coerce.number().int().min(1, "Semester must be at least 1").max(20, "Semester is too high"),
  allocationYear: z.coerce
    .number()
    .int()
    .min(2000, "Allocation year is invalid")
    .max(2200, "Allocation year is invalid"),
});

export function buildRequestPayload(values) {
  return {
    roomId: values.roomId,
    requestType: values.requestType || "new_room_request",
    requestReason: values.requestReason.trim(),
    semester: Number(values.semester),
    allocationYear: Number(values.allocationYear),
  };
}
