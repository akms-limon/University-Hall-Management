import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError.js";

export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(StatusCodes.FORBIDDEN, "You are not authorized for this action"));
    }

    return next();
  };
}

