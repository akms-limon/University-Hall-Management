import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError.js";
import { formatValidationError } from "../validations/formatValidationError.js";

export function validateRequest(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parsed.success) {
      return next(
        new ApiError(StatusCodes.BAD_REQUEST, "Validation failed", formatValidationError(parsed.error))
      );
    }

    req.body = parsed.data.body ?? req.body;
    req.params = parsed.data.params ?? req.params;
    req.query = parsed.data.query ?? req.query;

    return next();
  };
}

