import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { staffController } from "../controllers/staffController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createStaffSchema,
  listStaffSchema,
  staffRecordIdParamSchema,
  updateMyStaffProfileSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
} from "../validations/staffValidation.js";

const router = Router();

router.use(requireAuth);

router.get("/me", authorize(USER_ROLES.STAFF), asyncHandler(staffController.getMyProfile));
router.patch(
  "/me",
  authorize(USER_ROLES.STAFF),
  validateRequest(updateMyStaffProfileSchema),
  asyncHandler(staffController.updateMyProfile)
);

router.post(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(createStaffSchema),
  asyncHandler(staffController.createStaff)
);
router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listStaffSchema),
  asyncHandler(staffController.listStaff)
);
router.get(
  "/:staffRecordId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(staffRecordIdParamSchema),
  asyncHandler(staffController.getStaffById)
);
router.patch(
  "/:staffRecordId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateStaffSchema),
  asyncHandler(staffController.updateStaffById)
);
router.patch(
  "/:staffRecordId/status",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateStaffStatusSchema),
  asyncHandler(staffController.updateStaffStatus)
);

export default router;
