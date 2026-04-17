import { Router } from "express";
import { upload } from "../config/upload.js";
import { USER_ROLES } from "../constants/roles.js";
import { exampleController } from "../controllers/exampleController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateFiles } from "../middlewares/validateFiles.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { protectedExampleQuerySchema } from "../validations/exampleValidation.js";
import { multiFileMetaSchema } from "../validations/uploadValidation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/protected",
  validateRequest(protectedExampleQuerySchema),
  asyncHandler(exampleController.protectedPing)
);
router.get(
  "/provost-only",
  authorize(USER_ROLES.PROVOST),
  asyncHandler(exampleController.provostOnlyPing)
);
router.post(
  "/upload-placeholder",
  validateRequest(multiFileMetaSchema),
  upload.array("attachments", 3),
  validateFiles({ required: true, maxCount: 3 }),
  asyncHandler(exampleController.uploadPlaceholder)
);

export default router;
