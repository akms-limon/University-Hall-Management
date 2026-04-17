import mongoose from "mongoose";

export const STUDENT_ALLOCATION_STATUS = {
  ALLOCATED: "allocated",
  REQUESTED: "requested",
  PENDING: "pending",
  NONE: "none",
};

export const studentAllocationStatusList = Object.values(STUDENT_ALLOCATION_STATUS);

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

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Not Assigned",
      index: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 20,
      default: 1,
      index: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
      default: "",
    },
    currentRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },
    allocationStatus: {
      type: String,
      enum: studentAllocationStatusList,
      default: STUDENT_ALLOCATION_STATUS.NONE,
      index: true,
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

studentSchema.index(
  { registrationNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { registrationNumber: { $type: "string", $ne: "" } },
  }
);

export const Student = mongoose.model("Student", studentSchema);
