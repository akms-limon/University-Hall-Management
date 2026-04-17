import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { analyticsController } from "../controllers/analyticsController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  provostAnalyticsSummarySchema,
  staffDiningAnalyticsSchema,
} from "../validations/analyticsValidation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/provost/summary",
  authorize(USER_ROLES.PROVOST),
  validateRequest(provostAnalyticsSummarySchema),
  asyncHandler(analyticsController.getProvostDashboardSummary)
);

router.get(
  "/staff/dining-summary",
  authorize(USER_ROLES.STAFF),
  validateRequest(staffDiningAnalyticsSchema),
  asyncHandler(analyticsController.getStaffDiningSummary)
);

export default router;
