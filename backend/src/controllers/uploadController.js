import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { UploadedFile } from "../models/UploadedFile.js";
import { deleteCloudinaryAsset, uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

function buildPublicPath(fileId) {
  return `/api/v1/media/${encodeURIComponent(fileId)}`;
}

export const uploadController = {
  async uploadFiles(req, res) {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "At least one file is required");
    }

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        if (!file?.buffer || !file?.mimetype) {
          throw new ApiError(StatusCodes.BAD_REQUEST, "Unable to process uploaded file");
        }

        const uploaded = await uploadBufferToCloudinary(file.buffer, {
          resourceType: "auto",
        });

        const stored = await UploadedFile.create({
          originalName: file.originalname || "",
          mimeType: file.mimetype,
          size: Number(file.size || file.buffer.length || 0),
          publicId: uploaded.public_id || "",
          url: uploaded.secure_url || uploaded.url || "",
          resourceType: uploaded.resource_type || "raw",
          uploadedBy: req.user?.id || null,
        });
        const fileId = stored._id.toString();
        const url = stored.url || buildPublicPath(fileId);

        return {
          id: fileId,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: url,
          url,
        };
      })
    );

    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Files uploaded successfully",
        data: {
          files: uploadedFiles,
          urls: uploadedFiles.map((file) => file.url),
        },
      })
    );
  },

  async getPublicFile(req, res) {
    const { fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, "File not found");
    }

    const file = await UploadedFile.findById(fileId).select("mimeType data url");
    if (!file) {
      throw new ApiError(StatusCodes.NOT_FOUND, "File not found");
    }

    if (file.url) {
      return res.redirect(StatusCodes.FOUND, file.url);
    }

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=604800");
    return res.status(StatusCodes.OK).send(file.data);
  },

  async deleteFileById(fileId) {
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return;
    }

    const file = await UploadedFile.findById(fileId);
    if (!file) {
      return;
    }

    if (file.publicId) {
      await deleteCloudinaryAsset(file.publicId, file.resourceType || "auto");
    }

    await UploadedFile.deleteOne({ _id: file._id });
  },
};
