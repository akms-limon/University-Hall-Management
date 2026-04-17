import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import multer from "multer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { apiErrorResponse } from "../utils/ApiResponse.js";

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ApiError) {
    const isServerError = error.statusCode >= StatusCodes.INTERNAL_SERVER_ERROR;
    const logPayload = {
      stack: env.NODE_ENV === "production" || !isServerError ? undefined : error.stack,
      statusCode: error.statusCode,
    };

    if (isServerError) {
      logger.error(error.message, logPayload);
    } else {
      logger.warn(error.message, logPayload);
    }

    return res
      .status(error.statusCode)
      .json(apiErrorResponse({ message: error.message, errors: error.details || undefined }));
  }

  logger.error(error.message, {
    stack: env.NODE_ENV === "production" ? undefined : error.stack,
  });

  if (error instanceof multer.MulterError) {
    return res.status(StatusCodes.BAD_REQUEST).json(
      apiErrorResponse({
        message: "File upload failed",
        errors: [{ path: "file", message: error.message }],
      })
    );
  }

  if (error?.message?.includes("CORS policy")) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(apiErrorResponse({ message: "Request blocked by CORS policy" }));
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((entry) => ({
      path: entry.path,
      message: entry.message,
    }));

    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(apiErrorResponse({ message: "Validation failed", errors }));
  }

  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    return res.status(StatusCodes.CONFLICT).json(
      apiErrorResponse({
        message: `${field} already exists`,
      })
    );
  }

  return res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json(apiErrorResponse({ message: "Something went wrong" }));
}
