import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { hallApplicationController } from "../controllers/hallApplicationController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  approveApplicationSchema,
  hallApplicationIdParamSchema,
  listHallApplicationsSchema,
  listMyHallApplicationsSchema,
  rejectApplicationSchema,
  scheduleMeetingSchema,
  submitHallApplicationSchema,
  updateHallApplicationReviewSchema,
  updateHallApplicationStatusSchema,
  updateMyHallApplicationSchema,
  waitlistApplicationSchema,
} from "../validations/hallApplicationValidation.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(submitHallApplicationSchema),
  asyncHandler(hallApplicationController.submitMyApplication)
);
router.get(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(listMyHallApplicationsSchema),
  asyncHandler(hallApplicationController.listMyApplications)
);
router.get("/me/latest", authorize(USER_ROLES.STUDENT), asyncHandler(hallApplicationController.getMyLatestApplication));
router.get(
  "/me/:applicationId",
  authorize(USER_ROLES.STUDENT),
  validateRequest(hallApplicationIdParamSchema),
  asyncHandler(hallApplicationController.getMyApplicationById)
);
router.patch(
  "/me/:applicationId",
  authorize(USER_ROLES.STUDENT),
  validateRequest(updateMyHallApplicationSchema),
  asyncHandler(hallApplicationController.updateMyApplication)
);

router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listHallApplicationsSchema),
  asyncHandler(hallApplicationController.listHallApplications)
);
router.get(
  "/:applicationId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(hallApplicationIdParamSchema),
  asyncHandler(hallApplicationController.getHallApplicationById)
);
router.patch(
  "/:applicationId/review",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateHallApplicationReviewSchema),
  asyncHandler(hallApplicationController.updateReview)
);
router.patch(
  "/:applicationId/status",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateHallApplicationStatusSchema),
  asyncHandler(hallApplicationController.updateStatus)
);
router.patch(
  "/:applicationId/schedule-meeting",
  authorize(USER_ROLES.PROVOST),
  validateRequest(scheduleMeetingSchema),
  asyncHandler(hallApplicationController.scheduleMeeting)
);
router.patch(
  "/:applicationId/approve",
  authorize(USER_ROLES.PROVOST),
  validateRequest(approveApplicationSchema),
  asyncHandler(hallApplicationController.approveApplication)
);
router.patch(
  "/:applicationId/reject",
  authorize(USER_ROLES.PROVOST),
  validateRequest(rejectApplicationSchema),
  asyncHandler(hallApplicationController.rejectApplication)
);
router.patch(
  "/:applicationId/waitlist",
  authorize(USER_ROLES.PROVOST),
  validateRequest(waitlistApplicationSchema),
  asyncHandler(hallApplicationController.waitlistApplication)
);

export default router;
