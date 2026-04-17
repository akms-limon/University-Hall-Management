import mongoose from "mongoose";

export const COMPLAINT_CATEGORIES = {
  MAINTENANCE: "maintenance",
  FOOD_QUALITY: "food_quality",
  ROOM_CONDITION: "room_condition",
  ROOMMATE: "roommate",
  FACILITY: "facility",
  HYGIENE: "hygiene",
  OTHER: "other",
};

export const COMPLAINT_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export const COMPLAINT_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in-progress",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

export const complaintCategoryList = Object.values(COMPLAINT_CATEGORIES);
export const complaintSeverityList = Object.values(COMPLAINT_SEVERITY);
export const complaintStatusList = Object.values(COMPLAINT_STATUS);

const complaintSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    category: {
      type: String,
      required: true,
      enum: complaintCategoryList,
      index: true,
    },
    severity: {
      type: String,
      enum: complaintSeverityList,
      default: COMPLAINT_SEVERITY.MEDIUM,
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: complaintStatusList,
      default: COMPLAINT_STATUS.OPEN,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
      index: true,
    },
    resolution: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    resolutionDate: {
      type: Date,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

complaintSchema.index({ student: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });

export const Complaint = mongoose.model("Complaint", complaintSchema);
