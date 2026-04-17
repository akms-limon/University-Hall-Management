import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { imageUpload } from "../config/imageUpload.js";
import { imageRecordController } from "../controllers/imageRecordController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateFiles } from "../middlewares/validateFiles.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createImageRecordSchema,
  imageRecordIdParamSchema,
  listImageRecordsQuerySchema,
  updateImageRecordSchema,
} from "../validations/imageRecordValidation.js";

const router = Router();

router.use(requireAuth);

router.get("/", validateRequest(listImageRecordsQuerySchema), asyncHandler(imageRecordController.listImageRecords));
router.get(
  "/:imageId",
  validateRequest(imageRecordIdParamSchema),
  asyncHandler(imageRecordController.getImageRecordById)
);

router.post(
  "/",
  authorize(USER_ROLES.PROVOST),
  imageUpload.single("image"),
  validateFiles({ required: true, maxCount: 1 }),
  validateRequest(createImageRecordSchema),
  asyncHandler(imageRecordController.createImageRecord)
);

router.patch(
  "/:imageId",
  authorize(USER_ROLES.PROVOST),
  imageUpload.single("image"),
  validateFiles({ required: false, maxCount: 1 }),
  validateRequest(updateImageRecordSchema),
  asyncHandler(imageRecordController.updateImageRecordById)
);

router.delete(
  "/:imageId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(imageRecordIdParamSchema),
  asyncHandler(imageRecordController.deleteImageRecordById)
);

export default router;

