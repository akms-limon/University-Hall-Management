import { randomUUID } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import { cloudinary, ensureCloudinaryConfigured, hasCloudinaryCredentials } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

function assertCloudinaryAvailable() {
  if (!hasCloudinaryCredentials()) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  ensureCloudinaryConfigured();
}

export function uploadBufferToCloudinary(buffer, options = {}) {
  assertCloudinaryAvailable();

  return new Promise((resolve, reject) => {
    const uploader = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || env.CLOUDINARY_UPLOAD_FOLDER,
        resource_type: options.resourceType || "auto",
        public_id: options.publicId || randomUUID(),
      },
      (error, result) => {
        if (error) {
          reject(new ApiError(StatusCodes.BAD_GATEWAY, "Cloudinary upload failed"));
          return;
        }

        resolve(result);
      }
    );

    uploader.end(buffer);
  });
}

export async function deleteCloudinaryAsset(publicId, resourceType = "image") {
  if (!publicId || !hasCloudinaryCredentials()) {
    return;
  }

  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}
