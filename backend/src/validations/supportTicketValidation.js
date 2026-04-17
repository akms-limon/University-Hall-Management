import { z } from "zod";
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_STATUS,
} from "../models/SupportTicket.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const categoryEnum = z.enum(Object.values(SUPPORT_TICKET_CATEGORIES));
const priorityEnum = z.enum(Object.values(SUPPORT_TICKET_PRIORITY));
const statusEnum = z.enum(Object.values(SUPPORT_TICKET_STATUS));

const trimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmed = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

export const supportTicketIdParamSchema = z.object({
  params: z.object({
    ticketId: z.string().trim().regex(objectIdPattern, "Invalid support ticket id"),
  }),
});

export const createSupportTicketSchema = z.object({
  body: z.object({
    subject: trimmedString("Subject", 4, 180),
    description: trimmedString("Description", 12, 4000),
    category: categoryEnum,
    priority: priorityEnum.optional(),
    attachments: z
      .array(trimmedString("Attachment", 2, 500))
      .max(10, "Attachments cannot exceed 10 items")
      .optional(),
  }),
});

export const listMySupportTicketsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    status: statusEnum.optional(),
    category: categoryEnum.optional(),
    priority: priorityEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "priority", "category"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const addMyTicketMessageSchema = z.object({
  params: z.object({
    ticketId: z.string().trim().regex(objectIdPattern, "Invalid support ticket id"),
  }),
  body: z.object({
    message: trimmedString("Message", 1, 3000),
    attachments: z.array(trimmedString("Attachment", 2, 500)).max(10, "Attachments cannot exceed 10 items").optional(),
  }),
});

export const listAssignedSupportTicketsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    status: statusEnum.optional(),
    category: categoryEnum.optional(),
    priority: priorityEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "priority", "category"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const addAssignedTicketMessageSchema = z.object({
  params: z.object({
    ticketId: z.string().trim().regex(objectIdPattern, "Invalid support ticket id"),
  }),
  body: z.object({
    message: trimmedString("Message", 1, 3000),
    attachments: z.array(trimmedString("Attachment", 2, 500)).max(10, "Attachments cannot exceed 10 items").optional(),
  }),
});

export const updateAssignedSupportTicketSchema = z.object({
  params: z.object({
    ticketId: z.string().trim().regex(objectIdPattern, "Invalid support ticket id"),
  }),
  body: z
    .object({
      status: z.enum([SUPPORT_TICKET_STATUS.IN_PROGRESS, SUPPORT_TICKET_STATUS.RESOLVED]).optional(),
      resolution: optionalTrimmed("Resolution", 2000),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    }),
});

export const listSupportTicketsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    category: categoryEnum.optional(),
    priority: priorityEnum.optional(),
    status: statusEnum.optional(),
    assignedTo: z.string().trim().regex(objectIdPattern, "Invalid assigned staff id").optional(),
    isAssigned: booleanFromQuery.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "priority", "category"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const assignSupportTicketSchema = z.object({
  params: z.object({
    ticketId: z.string().trim().regex(objectIdPattern, "Invalid support ticket id"),
  }),
  body: z.object({
    staffId: z.string().trim().regex(objectIdPattern, "Invalid staff id"),
  }),
});

export const updateSupportTicketStatusSchema = z.object({
  params: z.object({
    ticketId: z.string().trim().regex(objectIdPattern, "Invalid support ticket id"),
  }),
  body: z.object({
    status: statusEnum,
    resolution: optionalTrimmed("Resolution", 2000),
  }),
});

export const addProvostTicketMessageSchema = z.object({
  params: z.object({
    ticketId: z.string().trim().regex(objectIdPattern, "Invalid support ticket id"),
  }),
  body: z.object({
    message: trimmedString("Message", 1, 3000),
    attachments: z.array(trimmedString("Attachment", 2, 500)).max(10, "Attachments cannot exceed 10 items").optional(),
  }),
});
