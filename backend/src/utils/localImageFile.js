import fs from "node:fs/promises";
import path from "node:path";
import { uploadDir, uploadPublicPath } from "../config/storage.js";

function resolveUploadAbsolutePath(imagePath) {
  if (typeof imagePath !== "string" || !imagePath.trim()) {
    return "";
  }

  const normalized = imagePath.trim().replace(/\\/g, "/");
  const marker = `${uploadPublicPath}/`;
  const index = normalized.indexOf(marker);
  const relative = index >= 0 ? normalized.slice(index + marker.length) : path.basename(normalized);
  const absolute = path.resolve(uploadDir, relative);
  const uploadsRoot = path.resolve(uploadDir);

  if (!absolute.startsWith(uploadsRoot)) {
    return "";
  }

  return absolute;
}

export async function removeLocalImageFile(imagePath) {
  const absolutePath = resolveUploadAbsolutePath(imagePath);
  if (!absolutePath) {
    return;
  }

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

