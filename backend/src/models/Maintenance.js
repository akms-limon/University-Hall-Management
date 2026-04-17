import mongoose from "mongoose";

export const MAINTENANCE_CATEGORIES = {
  ELECTRICAL: "electrical",
  PLUMBING: "plumbing",
  STRUCTURAL: "structural",
  FURNITURE: "furniture",
  APPLIANCE: "appliance",
  OTHER: "other",
};

export const MAINTENANCE_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export const MAINTENANCE_STATUS = {
  REPORTED: "reported",
  INSPECTED: "inspected",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CLOSED: "closed",
};

export const maintenanceCategoryList = Object.values(MAINTENANCE_CATEGORIES);
export const maintenanceSeverityList = Object.values(MAINTENANCE_SEVERITY);
export const maintenanceStatusList = Object.values(MAINTENANCE_STATUS);

const materialUsedSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    quantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    cost: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const maintenanceSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    issue: {
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
    category: {
      type: String,
      required: true,
      enum: maintenanceCategoryList,
      index: true,
    },
    severity: {
      type: String,
      enum: maintenanceSeverityList,
      default: MAINTENANCE_SEVERITY.MEDIUM,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: maintenanceStatusList,
      default: MAINTENANCE_STATUS.REPORTED,
      index: true,
    },
    beforePhotos: {
      type: [String],
      default: [],
    },
    afterPhotos: {
      type: [String],
      default: [],
    },
    estimatedCost: {
      type: Number,
      min: 0,
      default: null,
    },
    actualCost: {
      type: Number,
      min: 0,
      default: null,
    },
    materialUsed: {
      type: [materialUsedSchema],
      default: [],
    },
    workLog: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    completionDate: {
      type: Date,
      default: null,
    },
    invoiceDocument: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

maintenanceSchema.index({ room: 1, createdAt: -1 });
maintenanceSchema.index({ reportedBy: 1, createdAt: -1 });
maintenanceSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });

export const Maintenance = mongoose.model("Maintenance", maintenanceSchema);
