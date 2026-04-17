import { z } from "zod";

const requiredTrimmedString = (label, min = 1, max = 1200) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmedString = (label, max = 1200) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const taskCreateSchema = z.object({
  title: requiredTrimmedString("Title", 4, 180),
  description: requiredTrimmedString("Description", 12, 4000),
  assignedTo: z.string().trim().min(1, "Assigned staff is required"),
  room: z.string().trim().optional(),
  taskType: z.enum(["cleaning", "maintenance", "inspection", "repair", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: requiredTrimmedString("Due date", 4, 40),
  attachmentsText: optionalTrimmedString("Attachments", 2000),
});

export const taskUpdateSchema = z
  .object({
    title: optionalTrimmedString("Title", 180).optional(),
    description: optionalTrimmedString("Description", 4000).optional(),
    assignedTo: z.string().trim().optional(),
    room: z.string().trim().nullable().optional(),
    taskType: z.enum(["cleaning", "maintenance", "inspection", "repair", "other"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate: z.string().trim().optional(),
    attachmentsText: optionalTrimmedString("Attachments", 2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const taskStaffUpdateSchema = z
  .object({
    status: z.enum(["in-progress", "completed"]).optional(),
    completionNotes: optionalTrimmedString("Completion notes", 2000).optional(),
    completionPhotosText: optionalTrimmedString("Completion photos", 2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one update field is required",
  });

export const taskStatusUpdateSchema = z.object({
  status: z.enum(["pending", "in-progress", "completed", "cancelled"]),
  completionNotes: optionalTrimmedString("Completion notes", 2000).optional(),
  completionPhotosText: optionalTrimmedString("Completion photos", 2000).optional(),
});

function parseAttachmentText(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildTaskCreatePayload(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    assignedTo: values.assignedTo,
    room: values.room || undefined,
    taskType: values.taskType,
    priority: values.priority,
    dueDate: values.dueDate,
    attachments: parseAttachmentText(values.attachmentsText),
  };
}

export function buildTaskUpdatePayload(values) {
  const payload = {};
  if (values.title !== undefined) payload.title = values.title?.trim();
  if (values.description !== undefined) payload.description = values.description?.trim();
  if (values.assignedTo !== undefined) payload.assignedTo = values.assignedTo || undefined;
  if (values.room !== undefined) payload.room = values.room === "" ? null : values.room;
  if (values.taskType !== undefined) payload.taskType = values.taskType;
  if (values.priority !== undefined) payload.priority = values.priority;
  if (values.dueDate !== undefined) payload.dueDate = values.dueDate;
  if (values.attachmentsText !== undefined) payload.attachments = parseAttachmentText(values.attachmentsText);
  return payload;
}

export function buildTaskStaffUpdatePayload(values) {
  const payload = {};
  if (values.status !== undefined) payload.status = values.status;
  if (values.completionNotes !== undefined) payload.completionNotes = values.completionNotes?.trim() || "";
  if (values.completionPhotosText !== undefined) payload.completionPhotos = parseAttachmentText(values.completionPhotosText);
  return payload;
}

export function buildTaskStatusUpdatePayload(values) {
  return {
    status: values.status,
    completionNotes: values.completionNotes?.trim() || undefined,
    completionPhotos: parseAttachmentText(values.completionPhotosText),
  };
}

