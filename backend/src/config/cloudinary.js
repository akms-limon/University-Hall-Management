import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

let configured = false;

function isCloudinaryConfigured() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export function ensureCloudinaryConfigured() {
  if (configured || !isCloudinaryConfigured()) {
    return;
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  configured = true;
}

export function hasCloudinaryCredentials() {
  return isCloudinaryConfigured();
}

export { cloudinary };
