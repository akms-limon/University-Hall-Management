import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const source = process.env;
const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const normalizedSource = {
  NODE_ENV: source.NODE_ENV,
  PORT: source.PORT,
  TRUST_PROXY: source.TRUST_PROXY,
  MONGODB_URI: source.MONGODB_URI,
  JWT_SECRET: source.JWT_SECRET ?? source.JWT_ACCESS_SECRET,
  JWT_EXPIRES_IN: source.JWT_EXPIRES_IN ?? source.JWT_ACCESS_EXPIRES_IN,
  CLIENT_URL: source.CLIENT_URL ?? source.CLIENT_ORIGIN,
  COOKIE_SECRET: source.COOKIE_SECRET ?? source.JWT_SECRET ?? source.JWT_ACCESS_SECRET,
  COOKIE_SECURE: source.COOKIE_SECURE ?? (source.NODE_ENV === "production" ? "true" : "false"),
  COOKIE_SAME_SITE: source.COOKIE_SAME_SITE,
  COOKIE_DOMAIN: source.COOKIE_DOMAIN,
  COOKIE_MAX_AGE_MS: source.COOKIE_MAX_AGE_MS,
  RATE_LIMIT_WINDOW_MS: source.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX: source.RATE_LIMIT_MAX,
  AUTH_LOGIN_WINDOW_MS: source.AUTH_LOGIN_WINDOW_MS,
  AUTH_LOGIN_MAX_ATTEMPTS: source.AUTH_LOGIN_MAX_ATTEMPTS,
  AUTH_LOGIN_LOCKOUT_MS: source.AUTH_LOGIN_LOCKOUT_MS,
  UPLOAD_STORAGE: source.UPLOAD_STORAGE,
  UPLOAD_MAX_FILE_SIZE_MB: source.UPLOAD_MAX_FILE_SIZE_MB,
  UPLOAD_ALLOWED_MIME_TYPES: source.UPLOAD_ALLOWED_MIME_TYPES,
  CLOUDINARY_CLOUD_NAME: source.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: source.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: source.CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_FOLDER: source.CLOUDINARY_UPLOAD_FOLDER,
  PAYMENT_PROVIDER: source.PAYMENT_PROVIDER,
  PAYMENT_API_BASE_URL: source.PAYMENT_API_BASE_URL,
  PAYMENT_API_KEY: source.PAYMENT_API_KEY,
  PAYMENT_API_SECRET: source.PAYMENT_API_SECRET,
  PAYMENT_WEBHOOK_SECRET: source.PAYMENT_WEBHOOK_SECRET,
  SSLCOMMERZ_STORE_ID: source.SSLCOMMERZ_STORE_ID,
  SSLCOMMERZ_STORE_PASSWORD: source.SSLCOMMERZ_STORE_PASSWORD,
  SSLCOMMERZ_IS_SANDBOX: source.SSLCOMMERZ_IS_SANDBOX,
  SSLCOMMERZ_SANDBOX_BASE_URL: source.SSLCOMMERZ_SANDBOX_BASE_URL,
  SSLCOMMERZ_LIVE_BASE_URL: source.SSLCOMMERZ_LIVE_BASE_URL,
  SSLCOMMERZ_SUCCESS_URL: source.SSLCOMMERZ_SUCCESS_URL,
  SSLCOMMERZ_FAIL_URL: source.SSLCOMMERZ_FAIL_URL,
  SSLCOMMERZ_CANCEL_URL: source.SSLCOMMERZ_CANCEL_URL,
  SSLCOMMERZ_IPN_URL: source.SSLCOMMERZ_IPN_URL,
  APP_TIMEZONE: source.APP_TIMEZONE,
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  TRUST_PROXY: booleanFromEnv.default(false),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().min(1, "CLIENT_URL is required"),
  COOKIE_SECRET: z.string().min(8, "COOKIE_SECRET must be at least 8 characters"),
  COOKIE_SECURE: booleanFromEnv.default(false),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_MAX_AGE_MS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60 * 1000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  AUTH_LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_LOCKOUT_MS: z.coerce.number().int().positive().default(30 * 60 * 1000),
  UPLOAD_STORAGE: z.enum(["memory"]).default("memory"),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .default("image/jpeg,image/png,image/webp,application/pdf"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default("university-hall-management"),
  PAYMENT_PROVIDER: z.string().default("sandbox"),
  PAYMENT_API_BASE_URL: z.string().optional().default(""),
  PAYMENT_API_KEY: z.string().optional().default(""),
  PAYMENT_API_SECRET: z.string().optional().default(""),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default(""),
  SSLCOMMERZ_STORE_ID: z.string().optional().default(""),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional().default(""),
  SSLCOMMERZ_IS_SANDBOX: booleanFromEnv.default(true),
  SSLCOMMERZ_SANDBOX_BASE_URL: z.string().default("https://sandbox.sslcommerz.com"),
  SSLCOMMERZ_LIVE_BASE_URL: z.string().default("https://securepay.sslcommerz.com"),
  SSLCOMMERZ_SUCCESS_URL: z.string().optional().default(""),
  SSLCOMMERZ_FAIL_URL: z.string().optional().default(""),
  SSLCOMMERZ_CANCEL_URL: z.string().optional().default(""),
  SSLCOMMERZ_IPN_URL: z.string().optional().default(""),
  APP_TIMEZONE: z.string().min(1).default("Asia/Dhaka"),
});

const parsed = envSchema.safeParse(normalizedSource);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => issue.message).join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

if (parsed.data.COOKIE_SAME_SITE === "none" && !parsed.data.COOKIE_SECURE) {
  throw new Error("Invalid environment configuration: COOKIE_SAME_SITE=none requires COOKIE_SECURE=true");
}

export const env = parsed.data;
