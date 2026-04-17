import mongoose from "mongoose";

export const SUPPORT_TICKET_CATEGORIES = {
  ACADEMIC: "academic",
  HEALTH: "health",
  PERSONAL: "personal",
  FINANCIAL: "financial",
  TECHNICAL: "technical",
  OTHER: "other",
};

export const SUPPORT_TICKET_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

export const SUPPORT_TICKET_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in-progress",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

export const supportTicketCategoryList = Object.values(SUPPORT_TICKET_CATEGORIES);
export const supportTicketPriorityList = Object.values(SUPPORT_TICKET_PRIORITY);
export const supportTicketStatusList = Object.values(SUPPORT_TICKET_STATUS);

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    attachments: {
      type: [String],
      default: [],
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const supportTicketSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    subject: {
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
      enum: supportTicketCategoryList,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: supportTicketPriorityList,
      default: SUPPORT_TICKET_PRIORITY.MEDIUM,
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: supportTicketStatusList,
      default: SUPPORT_TICKET_STATUS.OPEN,
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
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

supportTicketSchema.index({ student: 1, createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });

export const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
