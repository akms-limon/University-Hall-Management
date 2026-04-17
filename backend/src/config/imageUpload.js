import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError.js";

const allowedImageMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function imageFileFilter(_req, file, callback) {
  if (!allowedImageMimeTypes.includes(file.mimetype)) {
    return callback(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        "Unsupported image type",
        [{ path: "image", message: "Allowed types: jpg, jpeg, png, webp" }]
      )
    );
  }

  return callback(null, true);
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});
