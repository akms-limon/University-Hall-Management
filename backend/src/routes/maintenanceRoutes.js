import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { maintenanceController } from "../controllers/maintenanceController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  assignMaintenanceSchema,
  createMaintenanceSchema,
  listAssignedMaintenanceSchema,
  listMaintenanceSchema,
  listMyMaintenanceSchema,
  maintenanceIdParamSchema,
  updateAssignedMaintenanceSchema,
  updateMaintenanceStatusSchema,
} from "../validations/maintenanceValidation.js";

const router = Router();

router.use(requireAuth);

// Student routes
router.post(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(createMaintenanceSchema),
  asyncHandler(maintenanceController.createMyMaintenance)
);
router.get(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(listMyMaintenanceSchema),
  asyncHandler(maintenanceController.listMyMaintenance)
);
router.get(
  "/me/:maintenanceId",
  authorize(USER_ROLES.STUDENT),
  validateRequest(maintenanceIdParamSchema),
  asyncHandler(maintenanceController.getMyMaintenanceById)
);

// Staff routes
router.get(
  "/assigned",
  authorize(USER_ROLES.STAFF),
  validateRequest(listAssignedMaintenanceSchema),
  asyncHandler(maintenanceController.listAssignedMaintenance)
);
router.get(
  "/assigned/:maintenanceId",
  authorize(USER_ROLES.STAFF),
  validateRequest(maintenanceIdParamSchema),
  asyncHandler(maintenanceController.getAssignedMaintenanceById)
);
router.patch(
  "/assigned/:maintenanceId",
  authorize(USER_ROLES.STAFF),
  validateRequest(updateAssignedMaintenanceSchema),
  asyncHandler(maintenanceController.updateAssignedMaintenance)
);

// Provost routes
router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listMaintenanceSchema),
  asyncHandler(maintenanceController.listMaintenance)
);
router.get(
  "/:maintenanceId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(maintenanceIdParamSchema),
  asyncHandler(maintenanceController.getMaintenanceById)
);
router.patch(
  "/:maintenanceId/assign",
  authorize(USER_ROLES.PROVOST),
  validateRequest(assignMaintenanceSchema),
  asyncHandler(maintenanceController.assignMaintenance)
);
router.patch(
  "/:maintenanceId/status",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateMaintenanceStatusSchema),
  asyncHandler(maintenanceController.updateMaintenanceStatus)
);

export default router;
