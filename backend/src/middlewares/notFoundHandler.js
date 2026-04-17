import { StatusCodes } from "http-status-codes";
import { apiErrorResponse } from "../utils/ApiResponse.js";

export function notFoundHandler(req, res) {
  return res
    .status(StatusCodes.NOT_FOUND)
    .json(apiErrorResponse({ message: `Route not found: ${req.method} ${req.originalUrl}` }));
}

