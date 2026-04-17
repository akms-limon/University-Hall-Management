import { Router } from "express";
import { systemController } from "../controllers/systemController.js";
import { uploadController } from "../controllers/uploadController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", systemController.index);
router.get("/health", systemController.health);
router.get("/homepage", systemController.homepage);
router.get("/media/:fileId", asyncHandler(uploadController.getPublicFile));

export default router;
