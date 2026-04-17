import { StatusCodes } from "http-status-codes";
import { getClearCookieOptions } from "../config/cookieOptions.js";
import { AUTH_COOKIE_NAME } from "../constants/app.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/jwt.js";

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

function extractCookieToken(req) {
  const signedCookie = req.signedCookies?.[AUTH_COOKIE_NAME];

  if (signedCookie === false) {
    return { token: null, invalidSignature: true };
  }

  if (typeof signedCookie === "string" && signedCookie.length > 0) {
    return { token: signedCookie, invalidSignature: false };
  }

  return { token: null, invalidSignature: false };
}

function extractToken(req) {
  const bearerToken = extractBearerToken(req);
  if (bearerToken) {
    return { token: bearerToken, source: "bearer", invalidCookieSignature: false };
  }

  const cookieToken = extractCookieToken(req);
  if (cookieToken.token) {
    return { token: cookieToken.token, source: "cookie", invalidCookieSignature: false };
  }

  return { token: null, source: null, invalidCookieSignature: cookieToken.invalidSignature };
}

async function resolveUserFromToken(token) {
  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.sub).lean();

  if (!user || !user.isActive) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or inactive user");
  }

  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };
}

export async function requireAuth(req, res, next) {
  const { token, source, invalidCookieSignature } = extractToken(req);

  if (!token) {
    if (invalidCookieSignature) {
      res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
    }

    return next(new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required"));
  }

  try {
    req.user = await resolveUserFromToken(token);
    return next();
  } catch {
    if (source === "cookie") {
      res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
    }

    return next(new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or expired token"));
  }
}

export async function optionalAuth(req, res, next) {
  const { token, source, invalidCookieSignature } = extractToken(req);

  if (!token) {
    if (invalidCookieSignature) {
      res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
    }

    return next();
  }

  try {
    req.user = await resolveUserFromToken(token);
  } catch {
    if (source === "cookie") {
      res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
    }

    req.user = null;
  }

  return next();
}
