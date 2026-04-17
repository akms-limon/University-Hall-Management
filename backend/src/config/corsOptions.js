import { env } from "./env.js";

function normalizeOrigin(origin) {
  return origin.trim().replace(/\/+$/, "");
}

const allowedOrigins = env.CLIENT_URL.split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }

    return callback(new Error("CORS policy: origin is not allowed"));
  },
  credentials: true,
};

export function getAllowedOrigins() {
  return [...allowedOrigins];
}
