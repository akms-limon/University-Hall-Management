import { z } from "zod";

const requiredTrimmedString = (label, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const roomFormSchema = z.object({
  roomNumber: requiredTrimmedString("Room number", 1, 40),
  floor: z.coerce.number().int().min(0, "Floor cannot be negative").max(100, "Floor is too high"),
  wing: requiredTrimmedString("Wing", 1, 80),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(20, "Capacity is too high"),
  status: z.enum(["vacant", "occupied", "maintenance", "closed"]),
  maintenanceNotes: optionalTrimmedString("Maintenance notes", 1200),
  lastCleaned: z
    .string()
    .trim()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Last cleaned date is invalid"),
  featuresText: optionalTrimmedString("Features", 2000),
  amenitiesText: optionalTrimmedString("Amenities", 2000),
  isActive: z.boolean(),
});

function parseTextList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildRoomPayload(values) {
  return {
    roomNumber: values.roomNumber.trim(),
    floor: Number(values.floor),
    wing: values.wing.trim(),
    capacity: Number(values.capacity),
    status: values.status,
    maintenanceNotes: values.maintenanceNotes.trim(),
    lastCleaned: values.lastCleaned ? values.lastCleaned : null,
    features: parseTextList(values.featuresText),
    amenities: parseTextList(values.amenitiesText),
    isActive: values.isActive,
  };
}
