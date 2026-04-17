import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { env } from "./env.js";
import { ApiError } from "../utils/ApiError.js";

const allowedMimeTypes = env.UPLOAD_ALLOWED_MIME_TYPES.split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const uploadStorage = multer.memoryStorage();

function uploadFileFilter(_req, file, callback) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        `Unsupported file type: ${file.mimetype}`,
        [{ path: "file", message: `Allowed types: ${allowedMimeTypes.join(", ")}` }]
      )
    );
  }

  return callback(null, true);
}

export const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: uploadFileFilter,
});

export const uploadConfig = {
  storage: env.UPLOAD_STORAGE,
  maxFileSizeMb: env.UPLOAD_MAX_FILE_SIZE_MB,
  allowedMimeTypes,
};

