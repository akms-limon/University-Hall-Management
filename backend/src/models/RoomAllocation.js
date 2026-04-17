import mongoose from "mongoose";

export const ROOM_ALLOCATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  ACTIVE: "active",
  COMPLETED: "completed",
};

export const roomAllocationStatusList = Object.values(ROOM_ALLOCATION_STATUS);

export const ROOM_ALLOCATION_REQUEST_TYPE = {
  NEW_ROOM_REQUEST: "new_room_request",
  TRANSFER_REQUEST: "transfer_request",
};

export const roomAllocationRequestTypeList = Object.values(ROOM_ALLOCATION_REQUEST_TYPE);

export const roomAllocationOpenStatusList = [
  ROOM_ALLOCATION_STATUS.PENDING,
  ROOM_ALLOCATION_STATUS.APPROVED,
  ROOM_ALLOCATION_STATUS.ACTIVE,
];

const roomAllocationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    requestType: {
      type: String,
      enum: roomAllocationRequestTypeList,
      required: true,
      default: ROOM_ALLOCATION_REQUEST_TYPE.NEW_ROOM_REQUEST,
      index: true,
    },
    currentRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
      index: true,
    },
    currentRoomNumber: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    allocationDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    releaseDate: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: roomAllocationStatusList,
      required: true,
      default: ROOM_ALLOCATION_STATUS.PENDING,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    requestReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      index: true,
    },
    allocationYear: {
      type: Number,
      required: true,
      min: 2000,
      max: 2200,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

roomAllocationSchema.index({
  student: 1,
  status: 1,
  allocationDate: -1,
});
roomAllocationSchema.index({
  room: 1,
  status: 1,
  allocationYear: 1,
  semester: 1,
});
roomAllocationSchema.index({
  requestType: 1,
  status: 1,
  allocationDate: -1,
});

export const RoomAllocation = mongoose.model("RoomAllocation", roomAllocationSchema);
