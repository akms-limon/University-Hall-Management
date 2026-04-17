import mongoose from "mongoose";

const uploadedFileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: "",
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    publicId: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
      index: true,
    },
    url: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    resourceType: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "raw",
    },
    data: {
      type: Buffer,
      required: false,
    },
    uploadedBy: {
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

uploadedFileSchema.index({ createdAt: -1 });

export const UploadedFile = mongoose.model("UploadedFile", uploadedFileSchema);
