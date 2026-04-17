import { env } from "../config/env.js";

const attemptBuckets = new Map();
let lastPruneAt = 0;

function normalizeIp(ipAddress) {
  if (!ipAddress) {
    return "unknown";
  }

  return ipAddress.replace(/^::ffff:/, "");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getBucketKey({ email, ipAddress }) {
  return `${normalizeEmail(email)}|${normalizeIp(ipAddress)}`;
}

function pruneBuckets(now) {
  if (now - lastPruneAt < 60 * 1000) {
    return;
  }

  const staleThreshold = Math.max(env.AUTH_LOGIN_WINDOW_MS, env.AUTH_LOGIN_LOCKOUT_MS) * 2;

  for (const [key, bucket] of attemptBuckets.entries()) {
    const isExpiredLock = bucket.lockUntil <= now;
    const isStale = now - bucket.lastSeenAt > staleThreshold;
    const hasNoFailures = bucket.failedCount === 0;

    if (isExpiredLock && (hasNoFailures || isStale)) {
      attemptBuckets.delete(key);
    }
  }

  lastPruneAt = now;
}

function getBucket(identity, now) {
  const key = getBucketKey(identity);
  const existing = attemptBuckets.get(key);

  if (!existing) {
    return {
      key,
      bucket: {
        failedCount: 0,
        windowStartAt: now,
        lockUntil: 0,
        lastSeenAt: now,
      },
    };
  }

  if (existing.lockUntil <= now && now - existing.windowStartAt > env.AUTH_LOGIN_WINDOW_MS) {
    existing.failedCount = 0;
    existing.windowStartAt = now;
  }

  existing.lastSeenAt = now;
  return { key, bucket: existing };
}

function toRetryAfterSeconds(lockUntil, now) {
  return Math.max(1, Math.ceil((lockUntil - now) / 1000));
}

export const loginAttemptService = {
  checkLock(identity) {
    const now = Date.now();
    pruneBuckets(now);

    const { key, bucket } = getBucket(identity, now);
    attemptBuckets.set(key, bucket);

    if (bucket.lockUntil > now) {
      return {
        locked: true,
        retryAfterSeconds: toRetryAfterSeconds(bucket.lockUntil, now),
      };
    }

    return { locked: false, retryAfterSeconds: 0 };
  },

  recordFailure(identity) {
    const now = Date.now();
    pruneBuckets(now);

    const { key, bucket } = getBucket(identity, now);

    if (bucket.lockUntil > now) {
      attemptBuckets.set(key, bucket);
      return {
        locked: true,
        retryAfterSeconds: toRetryAfterSeconds(bucket.lockUntil, now),
      };
    }

    if (now - bucket.windowStartAt > env.AUTH_LOGIN_WINDOW_MS) {
      bucket.failedCount = 0;
      bucket.windowStartAt = now;
    }

    bucket.failedCount += 1;
    bucket.lastSeenAt = now;

    if (bucket.failedCount >= env.AUTH_LOGIN_MAX_ATTEMPTS) {
      bucket.failedCount = 0;
      bucket.lockUntil = now + env.AUTH_LOGIN_LOCKOUT_MS;
      attemptBuckets.set(key, bucket);
      return {
        locked: true,
        retryAfterSeconds: toRetryAfterSeconds(bucket.lockUntil, now),
      };
    }

    attemptBuckets.set(key, bucket);
    return {
      locked: false,
      retryAfterSeconds: 0,
    };
  },

  clearFailures(identity) {
    const key = getBucketKey(identity);
    attemptBuckets.delete(key);
  },
};
