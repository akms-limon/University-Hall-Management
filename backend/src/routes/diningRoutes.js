import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { walletController } from "../controllers/walletController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { diningDateSummarySchema, diningTodaySummarySchema } from "../validations/walletValidation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/today-summary",
  authorize(USER_ROLES.STAFF),
  validateRequest(diningTodaySummarySchema),
  asyncHandler(walletController.getDiningTodaySummary)
);
router.get(
  "/date-summary",
  authorize(USER_ROLES.STAFF),
  validateRequest(diningDateSummarySchema),
  asyncHandler(walletController.getDiningDateSummary)
);

export default router;

