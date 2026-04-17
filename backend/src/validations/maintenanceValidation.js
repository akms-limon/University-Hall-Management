import { z } from "zod";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_SEVERITY,
  MAINTENANCE_STATUS,
} from "../models/Maintenance.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const categoryEnum = z.enum(Object.values(MAINTENANCE_CATEGORIES));
const severityEnum = z.enum(Object.values(MAINTENANCE_SEVERITY));
const statusEnum = z.enum(Object.values(MAINTENANCE_STATUS));

const trimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmed = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const materialSchema = z.object({
  name: trimmedString("Material name", 1, 140),
  quantity: z.coerce.number().min(0, "Material quantity cannot be negative"),
  cost: z.coerce.number().min(0, "Material cost cannot be negative"),
});

export const maintenanceIdParamSchema = z.object({
  params: z.object({
    maintenanceId: z.string().trim().regex(objectIdPattern, "Invalid maintenance id"),
  }),
});

export const createMaintenanceSchema = z.object({
  body: z.object({
    room: z.string().trim().regex(objectIdPattern, "Invalid room id"),
    issue: trimmedString("Issue", 4, 180),
    description: trimmedString("Description", 12, 4000),
    category: categoryEnum,
    severity: severityEnum.optional(),
    beforePhotos: z.array(trimmedString("Before photo", 2, 500)).max(10, "Before photos cannot exceed 10").optional(),
  }),
});

export const listMyMaintenanceSchema = z.object({
  query: z.object({
    status: statusEnum.optional(),
    category: categoryEnum.optional(),
    severity: severityEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "severity", "category"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const listAssignedMaintenanceSchema = z.object({
  query: z.object({
    status: statusEnum.optional(),
    category: categoryEnum.optional(),
    severity: severityEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "severity", "category"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const updateAssignedMaintenanceSchema = z.object({
  params: z.object({
    maintenanceId: z.string().trim().regex(objectIdPattern, "Invalid maintenance id"),
  }),
  body: z
    .object({
      status: z
        .enum([
          MAINTENANCE_STATUS.INSPECTED,
          MAINTENANCE_STATUS.IN_PROGRESS,
          MAINTENANCE_STATUS.COMPLETED,
        ])
        .optional(),
      workLog: optionalTrimmed("Work log", 3000),
      estimatedCost: z.coerce.number().min(0, "Estimated cost cannot be negative").optional(),
      actualCost: z.coerce.number().min(0, "Actual cost cannot be negative").optional(),
      materialUsed: z.array(materialSchema).max(50, "Material entries cannot exceed 50").optional(),
      beforePhotos: z.array(trimmedString("Before photo", 2, 500)).max(10, "Before photos cannot exceed 10").optional(),
      afterPhotos: z.array(trimmedString("After photo", 2, 500)).max(10, "After photos cannot exceed 10").optional(),
      invoiceDocument: optionalTrimmed("Invoice document", 500).nullable(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    }),
});

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return value;
}, z.boolean());

export const listMaintenanceSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    category: categoryEnum.optional(),
    severity: severityEnum.optional(),
    status: statusEnum.optional(),
    assignedTo: z.string().trim().regex(objectIdPattern, "Invalid assigned staff id").optional(),
    isAssigned: booleanFromQuery.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "severity", "category"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const assignMaintenanceSchema = z.object({
  params: z.object({
    maintenanceId: z.string().trim().regex(objectIdPattern, "Invalid maintenance id"),
  }),
  body: z.object({
    staffId: z.string().trim().regex(objectIdPattern, "Invalid staff id"),
  }),
});

export const updateMaintenanceStatusSchema = z.object({
  params: z.object({
    maintenanceId: z.string().trim().regex(objectIdPattern, "Invalid maintenance id"),
  }),
  body: z.object({
    status: statusEnum,
  }),
});
