import { StatusCodes } from "http-status-codes";
import { getAuthCookieOptions, getClearCookieOptions } from "../config/cookieOptions.js";
import { AUTH_COOKIE_NAME } from "../constants/app.js";
import { User } from "../models/User.js";
import { authService } from "../services/authService.js";
import { loginAttemptService } from "../services/loginAttemptService.js";
import { ApiError } from "../utils/ApiError.js";
import { apiErrorResponse, apiResponse } from "../utils/ApiResponse.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function isInvalidCredentialsError(error) {
  return (
    error instanceof ApiError &&
    error.statusCode === StatusCodes.UNAUTHORIZED &&
    error.message === "Invalid credentials"
  );
}

export const authController = {
  async register(req, res) {
    const result = await authService.registerStudent(req.body);
    setAuthCookie(res, result.token);

    return res
      .status(StatusCodes.CREATED)
      .json(apiResponse({ message: "Student account created", data: { user: result.user } }));
  },

  async login(req, res) {
    const identity = {
      email: req.body.email,
      ipAddress: req.ip,
    };

    const lockState = loginAttemptService.checkLock(identity);
    if (lockState.locked) {
      res.set("Retry-After", String(lockState.retryAfterSeconds));
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json(
        apiErrorResponse({
          message: "Too many failed login attempts. Please try again later.",
        })
      );
    }

    let result;
    try {
      result = await authService.login(req.body);
    } catch (error) {
      if (isInvalidCredentialsError(error)) {
        const failedAttemptState = loginAttemptService.recordFailure(identity);
        if (failedAttemptState.locked) {
          res.set("Retry-After", String(failedAttemptState.retryAfterSeconds));
          return res.status(StatusCodes.TOO_MANY_REQUESTS).json(
            apiErrorResponse({
              message: "Too many failed login attempts. Please try again later.",
            })
          );
        }
      }

      throw error;
    }

    loginAttemptService.clearFailures(identity);
    setAuthCookie(res, result.token);

    return res
      .status(StatusCodes.OK)
      .json(apiResponse({ message: "Login successful", data: { user: result.user } }));
  },

  async me(req, res) {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }

    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Profile fetched",
        data: {
          user: sanitizeUser(user),
        },
      })
    );
  },

  async logout(_req, res) {
    res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
    return res.status(StatusCodes.OK).json(apiResponse({ message: "Logged out successfully" }));
  },
};
