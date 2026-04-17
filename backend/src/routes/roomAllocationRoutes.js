import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { roomAllocationController } from "../controllers/roomAllocationController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  activateRoomAllocationSchema,
  approveRoomAllocationSchema,
  completeRoomAllocationSchema,
  createMyRoomAllocationSchema,
  listMyRoomAllocationsSchema,
  listRoomAllocationsSchema,
  rejectRoomAllocationSchema,
  roomAllocationIdParamSchema,
  transferRoomAllocationSchema,
} from "../validations/roomAllocationValidation.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(createMyRoomAllocationSchema),
  asyncHandler(roomAllocationController.createMyRequest)
);
router.get(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(listMyRoomAllocationsSchema),
  asyncHandler(roomAllocationController.listMyAllocations)
);
router.get("/me/latest", authorize(USER_ROLES.STUDENT), asyncHandler(roomAllocationController.getMyLatestAllocation));
router.get(
  "/me/:allocationId",
  authorize(USER_ROLES.STUDENT),
  validateRequest(roomAllocationIdParamSchema),
  asyncHandler(roomAllocationController.getMyAllocationById)
);

router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listRoomAllocationsSchema),
  asyncHandler(roomAllocationController.listAllocations)
);
router.get(
  "/:allocationId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(roomAllocationIdParamSchema),
  asyncHandler(roomAllocationController.getAllocationById)
);
router.patch(
  "/:allocationId/approve",
  authorize(USER_ROLES.PROVOST),
  validateRequest(approveRoomAllocationSchema),
  asyncHandler(roomAllocationController.approveAllocation)
);
router.patch(
  "/:allocationId/reject",
  authorize(USER_ROLES.PROVOST),
  validateRequest(rejectRoomAllocationSchema),
  asyncHandler(roomAllocationController.rejectAllocation)
);
router.patch(
  "/:allocationId/activate",
  authorize(USER_ROLES.PROVOST),
  validateRequest(activateRoomAllocationSchema),
  asyncHandler(roomAllocationController.activateAllocation)
);
router.patch(
  "/:allocationId/complete",
  authorize(USER_ROLES.PROVOST),
  validateRequest(completeRoomAllocationSchema),
  asyncHandler(roomAllocationController.completeAllocation)
);
router.patch(
  "/:allocationId/transfer",
  authorize(USER_ROLES.PROVOST),
  validateRequest(transferRoomAllocationSchema),
  asyncHandler(roomAllocationController.transferAllocation)
);

export default router;
