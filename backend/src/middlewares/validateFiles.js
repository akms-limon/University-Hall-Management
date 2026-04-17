import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError.js";

function normalizeFiles(req) {
  if (req.file) {
    return [req.file];
  }

  if (Array.isArray(req.files)) {
    return req.files;
  }

  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat();
  }

  return [];
}

export function validateFiles({ required = false, maxCount = 5 } = {}) {
  return (req, _res, next) => {
    const files = normalizeFiles(req);

    if (required && files.length === 0) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, "At least one file is required"));
    }

    if (files.length > maxCount) {
      return next(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          `Too many files uploaded. Maximum allowed is ${maxCount}`,
          [{ path: "files", message: `Received ${files.length} files` }]
        )
      );
    }

    return next();
  };
}

