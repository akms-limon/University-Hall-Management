import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { noticeController } from "../controllers/noticeController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createNoticeSchema,
  listMyNoticesSchema,
  listNoticesSchema,
  noticeIdParamSchema,
  setNoticeActiveSchema,
  updateNoticeSchema,
} from "../validations/noticeValidation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/me",
  authorize(USER_ROLES.STUDENT, USER_ROLES.STAFF, USER_ROLES.PROVOST),
  validateRequest(listMyNoticesSchema),
  asyncHandler(noticeController.listMyNotices)
);

router.get(
  "/me/:noticeId",
  authorize(USER_ROLES.STUDENT, USER_ROLES.STAFF, USER_ROLES.PROVOST),
  validateRequest(noticeIdParamSchema),
  asyncHandler(noticeController.getMyNoticeById)
);

router.post(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(createNoticeSchema),
  asyncHandler(noticeController.createNotice)
);

router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listNoticesSchema),
  asyncHandler(noticeController.listNotices)
);

router.get(
  "/:noticeId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(noticeIdParamSchema),
  asyncHandler(noticeController.getNoticeById)
);

router.patch(
  "/:noticeId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateNoticeSchema),
  asyncHandler(noticeController.updateNotice)
);

router.patch(
  "/:noticeId/publish",
  authorize(USER_ROLES.PROVOST),
  validateRequest(noticeIdParamSchema),
  asyncHandler(noticeController.publishNotice)
);

router.patch(
  "/:noticeId/active",
  authorize(USER_ROLES.PROVOST),
  validateRequest(setNoticeActiveSchema),
  asyncHandler(noticeController.setNoticeActive)
);

export default router;

