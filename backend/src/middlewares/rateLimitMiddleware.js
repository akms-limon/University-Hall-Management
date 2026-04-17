import { StatusCodes } from "http-status-codes";
import { env } from "../config/env.js";
import { apiErrorResponse } from "../utils/ApiResponse.js";

const requestBuckets = new Map();
let lastPruneAt = 0;

function normalizeIp(ipAddress) {
  if (!ipAddress) {
    return "unknown";
  }
  return ipAddress.replace(/^::ffff:/, "");
}

function normalizePath(pathname) {
  const rawPath = String(pathname || "").split("?")[0];
  const segments = rawPath
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments.length) {
    return "/";
  }

  // Keep rate-limit buckets stable and bounded by grouping at route-family level.
  return `/${segments.slice(0, 3).join("/")}`;
}

function getBucketKey(req) {
  const ip = normalizeIp(req.ip || req.socket?.remoteAddress);
  const method = String(req.method || "GET").toUpperCase();
  const pathKey = normalizePath(req.path || req.originalUrl || "/");
  return `${ip}|${method}|${pathKey}`;
}

function pruneBuckets(now) {
  if (now - lastPruneAt < 60 * 1000) {
    return;
  }

  for (const [key, bucket] of requestBuckets.entries()) {
    if (bucket.resetAt <= now) {
      requestBuckets.delete(key);
    }
  }

  lastPruneAt = now;
}

export function apiRateLimit(req, res, next) {
  const now = Date.now();
  pruneBuckets(now);

  const key = getBucketKey(req);
  const existingBucket = requestBuckets.get(key);
  const bucket =
    existingBucket && existingBucket.resetAt > now
      ? existingBucket
      : {
          count: 0,
          resetAt: now + env.RATE_LIMIT_WINDOW_MS,
        };

  bucket.count += 1;
  requestBuckets.set(key, bucket);

  const remaining = Math.max(0, env.RATE_LIMIT_MAX - bucket.count);
  const resetUnixSeconds = Math.ceil(bucket.resetAt / 1000);

  res.setHeader("X-RateLimit-Limit", String(env.RATE_LIMIT_MAX));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(resetUnixSeconds));

  if (bucket.count > env.RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));

    return res.status(StatusCodes.TOO_MANY_REQUESTS).json(
      apiErrorResponse({
        message: "Too many requests. Please try again shortly.",
      })
    );
  }

  return next();
}
