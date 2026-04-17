import { Router } from "express";
import { userController } from "../controllers/userController.js";
import { USER_ROLES } from "../constants/roles.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listUsersSchema, updateMyUserProfileSchema } from "../validations/userValidation.js";

const router = Router();

router.use(requireAuth);
router.get("/me", asyncHandler(userController.getMyProfile));
router.patch("/me", validateRequest(updateMyUserProfileSchema), asyncHandler(userController.updateMyProfile));
router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listUsersSchema),
  asyncHandler(userController.listUsers)
);
router.get(
  "/role-summary",
  authorize(USER_ROLES.PROVOST),
  asyncHandler(userController.roleSummary)
);

export default router;
