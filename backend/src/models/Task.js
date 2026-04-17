import mongoose from "mongoose";

export const TASK_TYPES = {
  CLEANING: "cleaning",
  MAINTENANCE: "maintenance",
  INSPECTION: "inspection",
  REPAIR: "repair",
  OTHER: "other",
};

export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const taskTypeList = Object.values(TASK_TYPES);
export const taskPriorityList = Object.values(TASK_PRIORITY);
export const taskStatusList = Object.values(TASK_STATUS);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
      index: true,
    },
    taskType: {
      type: String,
      enum: taskTypeList,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: taskPriorityList,
      default: TASK_PRIORITY.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: taskStatusList,
      default: TASK_STATUS.PENDING,
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    completionDate: {
      type: Date,
      default: null,
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    completionNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    completionPhotos: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
taskSchema.index({ taskType: 1, priority: 1, status: 1, dueDate: 1 });

export const Task = mongoose.model("Task", taskSchema);

