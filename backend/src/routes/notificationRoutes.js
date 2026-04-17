import { Router } from "express";
import { notificationController } from "../controllers/notificationController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listNotificationsSchema,
  notificationIdParamSchema,
} from "../validations/notificationValidation.js";

const router = Router();

router.use(requireAuth);

router.get("/", validateRequest(listNotificationsSchema), asyncHandler(notificationController.listMyNotifications));
router.get("/unread-count", asyncHandler(notificationController.getMyUnreadCount));
router.patch(
  "/:notificationId/read",
  validateRequest(notificationIdParamSchema),
  asyncHandler(notificationController.markMyNotificationRead)
);
router.patch("/read-all", asyncHandler(notificationController.markAllMyNotificationsRead));

export default router;
