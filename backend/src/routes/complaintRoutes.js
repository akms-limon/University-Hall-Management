import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { complaintController } from "../controllers/complaintController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addComplaintFeedbackSchema,
  assignComplaintSchema,
  complaintIdParamSchema,
  createComplaintSchema,
  listAssignedComplaintsSchema,
  listComplaintsSchema,
  listMyComplaintsSchema,
  updateAssignedComplaintSchema,
  updateComplaintStatusSchema,
} from "../validations/complaintValidation.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(createComplaintSchema),
  asyncHandler(complaintController.createMyComplaint)
);
router.get(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(listMyComplaintsSchema),
  asyncHandler(complaintController.listMyComplaints)
);
router.get(
  "/me/:complaintId",
  authorize(USER_ROLES.STUDENT),
  validateRequest(complaintIdParamSchema),
  asyncHandler(complaintController.getMyComplaintById)
);
router.patch(
  "/me/:complaintId/feedback",
  authorize(USER_ROLES.STUDENT),
  validateRequest(addComplaintFeedbackSchema),
  asyncHandler(complaintController.addMyFeedback)
);

router.get(
  "/assigned",
  authorize(USER_ROLES.STAFF),
  validateRequest(listAssignedComplaintsSchema),
  asyncHandler(complaintController.listAssignedComplaints)
);
router.get(
  "/assigned/:complaintId",
  authorize(USER_ROLES.STAFF),
  validateRequest(complaintIdParamSchema),
  asyncHandler(complaintController.getAssignedComplaintById)
);
router.patch(
  "/assigned/:complaintId",
  authorize(USER_ROLES.STAFF),
  validateRequest(updateAssignedComplaintSchema),
  asyncHandler(complaintController.updateAssignedComplaint)
);

router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listComplaintsSchema),
  asyncHandler(complaintController.listComplaints)
);
router.get(
  "/:complaintId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(complaintIdParamSchema),
  asyncHandler(complaintController.getComplaintById)
);
router.patch(
  "/:complaintId/assign",
  authorize(USER_ROLES.PROVOST),
  validateRequest(assignComplaintSchema),
  asyncHandler(complaintController.assignComplaint)
);
router.patch(
  "/:complaintId/status",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateComplaintStatusSchema),
  asyncHandler(complaintController.updateComplaintStatus)
);

export default router;
