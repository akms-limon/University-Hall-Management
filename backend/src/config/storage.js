import fs from "node:fs";
import path from "node:path";

export const uploadPublicPath = "/uploads";
export const uploadDir = path.resolve(process.cwd(), "uploads");

export function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}
