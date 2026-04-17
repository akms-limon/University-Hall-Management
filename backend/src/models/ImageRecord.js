import mongoose from "mongoose";

const imageRecordSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    imagePath: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    imagePublicId: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

imageRecordSchema.index({ createdAt: -1 });

export const ImageRecord = mongoose.model("ImageRecord", imageRecordSchema);
