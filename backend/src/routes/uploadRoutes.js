import { Router } from "express";
import { upload } from "../config/upload.js";
import { uploadController } from "../controllers/uploadController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { validateFiles } from "../middlewares/validateFiles.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  upload.array("files", 10),
  validateFiles({ required: true, maxCount: 10 }),
  asyncHandler(uploadController.uploadFiles)
);

export default router;
