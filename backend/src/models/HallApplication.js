import mongoose from "mongoose";

export const HALL_APPLICATION_STATUS = {
  PENDING: "pending",
  UNDER_REVIEW: "under_review",
  MEETING_SCHEDULED: "meeting_scheduled",
  APPROVED: "approved",
  REJECTED: "rejected",
  WAITLISTED: "waitlisted",
};

export const hallApplicationStatusList = Object.values(HALL_APPLICATION_STATUS);

export const hallApplicationActiveStatusList = [
  HALL_APPLICATION_STATUS.PENDING,
  HALL_APPLICATION_STATUS.UNDER_REVIEW,
  HALL_APPLICATION_STATUS.MEETING_SCHEDULED,
  HALL_APPLICATION_STATUS.WAITLISTED,
];

export const HALL_APPLICATION_REQUEST_TYPE = {
  NEW_ROOM_REQUEST: "new_room_request",
  TRANSFER_REQUEST: "transfer_request",
};

export const hallApplicationRequestTypeList = Object.values(HALL_APPLICATION_REQUEST_TYPE);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      match: /^[0-9+\-()\s]*$/,
      default: "",
    },
    relation: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const hallApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      index: true,
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: 20,
      match: /^[0-9+\-()\s]*$/,
      default: "",
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    requestType: {
      type: String,
      enum: hallApplicationRequestTypeList,
      default: HALL_APPLICATION_REQUEST_TYPE.NEW_ROOM_REQUEST,
      required: true,
      index: true,
    },
    currentRoomNumber: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    desiredRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
      index: true,
    },
    desiredRoomNumber: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    attachments: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 500,
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: hallApplicationStatusList,
      default: HALL_APPLICATION_STATUS.PENDING,
      required: true,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    meetingDate: {
      type: Date,
      default: null,
      index: true,
    },
    meetingNote: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    approvalNote: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    applicationDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

hallApplicationSchema.index({ student: 1, applicationDate: -1 });
hallApplicationSchema.index({ status: 1, department: 1, semester: 1, applicationDate: -1 });
hallApplicationSchema.index({ requestType: 1, status: 1, applicationDate: -1 });

export const HallApplication = mongoose.model("HallApplication", hallApplicationSchema);
