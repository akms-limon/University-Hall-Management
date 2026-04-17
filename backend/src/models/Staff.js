import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    staffId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      unique: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
      default: "",
    },
    joiningDate: {
      type: Date,
      required: true,
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

export const Staff = mongoose.model("Staff", staffSchema);
