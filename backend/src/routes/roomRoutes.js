import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { roomController } from "../controllers/roomController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createRoomSchema,
  listPublicRoomsSchema,
  listRoomsSchema,
  roomIdParamSchema,
  updateRoomSchema,
  updateRoomStatusSchema,
} from "../validations/roomValidation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/public",
  authorize(USER_ROLES.STUDENT, USER_ROLES.STAFF, USER_ROLES.PROVOST),
  validateRequest(listPublicRoomsSchema),
  asyncHandler(roomController.listPublicRooms)
);
router.get(
  "/public/:roomId",
  authorize(USER_ROLES.STUDENT, USER_ROLES.STAFF, USER_ROLES.PROVOST),
  validateRequest(roomIdParamSchema),
  asyncHandler(roomController.getPublicRoomById)
);

router.post(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(createRoomSchema),
  asyncHandler(roomController.createRoom)
);
router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listRoomsSchema),
  asyncHandler(roomController.listRooms)
);
router.get(
  "/:roomId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(roomIdParamSchema),
  asyncHandler(roomController.getRoomById)
);
router.patch(
  "/:roomId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateRoomSchema),
  asyncHandler(roomController.updateRoomById)
);
router.patch(
  "/:roomId/status",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateRoomStatusSchema),
  asyncHandler(roomController.updateRoomStatus)
);

export default router;
