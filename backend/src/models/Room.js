import mongoose from "mongoose";

export const ROOM_STATUS = {
  VACANT: "vacant",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance",
  CLOSED: "closed",
};

export const roomStatusList = Object.values(ROOM_STATUS);

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      unique: true,
      index: true,
    },
    floor: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    wing: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      default: 4,
    },
    occupants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: roomStatusList,
      required: true,
      default: ROOM_STATUS.VACANT,
      index: true,
    },
    maintenanceNotes: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    lastCleaned: {
      type: Date,
      default: null,
      index: true,
    },
    features: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 120,
        },
      ],
      default: [],
    },
    amenities: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 120,
        },
      ],
      default: [],
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

roomSchema.index({ floor: 1, wing: 1, status: 1, isActive: 1 });

export const Room = mongoose.model("Room", roomSchema);
