import mongoose from "mongoose";

export const NOTICE_CATEGORY = {
  ANNOUNCEMENT: "announcement",
  EMERGENCY: "emergency",
  MAINTENANCE: "maintenance",
  EVENT: "event",
  RULE_UPDATE: "rule_update",
  OTHER: "other",
};

export const NOTICE_TARGET_AUDIENCE = {
  ALL: "all",
  STUDENTS: "students",
  STAFF: "staff",
  PROVOST: "provost",
  SPECIFIC: "specific",
};

export const noticeCategoryList = Object.values(NOTICE_CATEGORY);
export const noticeTargetAudienceList = Object.values(NOTICE_TARGET_AUDIENCE);

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
    category: {
      type: String,
      enum: noticeCategoryList,
      default: NOTICE_CATEGORY.ANNOUNCEMENT,
      index: true,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    targetAudience: {
      type: String,
      enum: noticeTargetAudienceList,
      required: true,
      index: true,
    },
    targetUsers: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    applicableRooms: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Room",
        },
      ],
      default: [],
    },
    isUrgent: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

noticeSchema.index({ isActive: 1, targetAudience: 1, publishedDate: -1 });
noticeSchema.index({ category: 1, isUrgent: 1, isActive: 1, publishedDate: -1 });

export const Notice = mongoose.model("Notice", noticeSchema);

