import { z } from "zod";
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPES } from "../models/Task.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const taskTypeEnum = z.enum(Object.values(TASK_TYPES));
const taskPriorityEnum = z.enum(Object.values(TASK_PRIORITY));
const taskStatusEnum = z.enum(Object.values(TASK_STATUS));

const trimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmed = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

export const taskIdParamSchema = z.object({
  params: z.object({
    taskId: z.string().trim().regex(objectIdPattern, "Invalid task id"),
  }),
});

export const createTaskSchema = z.object({
  body: z.object({
    title: trimmedString("Title", 4, 180),
    description: trimmedString("Description", 12, 4000),
    assignedTo: z.string().trim().regex(objectIdPattern, "Invalid assigned staff id"),
    room: z.string().trim().regex(objectIdPattern, "Invalid room id").optional(),
    taskType: taskTypeEnum,
    priority: taskPriorityEnum.optional(),
    dueDate: z.coerce.date(),
    attachments: z.array(trimmedString("Attachment", 2, 500)).max(10, "Attachments cannot exceed 10 items").optional(),
  }),
});

export const listAssignedTasksSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    taskType: taskTypeEnum.optional(),
    priority: taskPriorityEnum.optional(),
    status: taskStatusEnum.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "priority", "dueDate"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const updateAssignedTaskSchema = z.object({
  params: z.object({
    taskId: z.string().trim().regex(objectIdPattern, "Invalid task id"),
  }),
  body: z
    .object({
      status: z.enum([TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED]).optional(),
      completionNotes: optionalTrimmed("Completion notes", 2000),
      completionPhotos: z.array(trimmedString("Completion photo", 2, 500)).max(10, "Completion photos cannot exceed 10 items").optional(),
    })
    .refine(
      (value) =>
        value.status !== undefined ||
        value.completionNotes !== undefined ||
        value.completionPhotos !== undefined,
      {
        message: "At least one update field is required",
      }
    ),
});

export const listTasksSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120, "Search query is too long").optional(),
    taskType: taskTypeEnum.optional(),
    priority: taskPriorityEnum.optional(),
    status: taskStatusEnum.optional(),
    assignedTo: z.string().trim().regex(objectIdPattern, "Invalid assigned staff id").optional(),
    room: z.string().trim().regex(objectIdPattern, "Invalid room id").optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "status", "priority", "dueDate"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    taskId: z.string().trim().regex(objectIdPattern, "Invalid task id"),
  }),
  body: z
    .object({
      title: trimmedString("Title", 4, 180).optional(),
      description: trimmedString("Description", 12, 4000).optional(),
      assignedTo: z.string().trim().regex(objectIdPattern, "Invalid assigned staff id").optional(),
      room: z.string().trim().regex(objectIdPattern, "Invalid room id").nullable().optional(),
      taskType: taskTypeEnum.optional(),
      priority: taskPriorityEnum.optional(),
      dueDate: z.coerce.date().optional(),
      attachments: z.array(trimmedString("Attachment", 2, 500)).max(10, "Attachments cannot exceed 10 items").optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one update field is required",
    }),
});

export const updateTaskStatusSchema = z.object({
  params: z.object({
    taskId: z.string().trim().regex(objectIdPattern, "Invalid task id"),
  }),
  body: z.object({
    status: taskStatusEnum,
    completionNotes: optionalTrimmed("Completion notes", 2000),
    completionPhotos: z.array(trimmedString("Completion photo", 2, 500)).max(10, "Completion photos cannot exceed 10 items").optional(),
  }),
});

