import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { taskController } from "../controllers/taskController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createTaskSchema,
  listAssignedTasksSchema,
  listTasksSchema,
  taskIdParamSchema,
  updateAssignedTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "../validations/taskValidation.js";

const router = Router();

router.use(requireAuth);

// Staff routes
router.get(
  "/assigned",
  authorize(USER_ROLES.STAFF),
  validateRequest(listAssignedTasksSchema),
  asyncHandler(taskController.listAssignedTasks)
);
router.get(
  "/assigned/:taskId",
  authorize(USER_ROLES.STAFF),
  validateRequest(taskIdParamSchema),
  asyncHandler(taskController.getAssignedTaskById)
);
router.patch(
  "/assigned/:taskId",
  authorize(USER_ROLES.STAFF),
  validateRequest(updateAssignedTaskSchema),
  asyncHandler(taskController.updateAssignedTask)
);

// Provost routes
router.post(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(createTaskSchema),
  asyncHandler(taskController.createTask)
);
router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listTasksSchema),
  asyncHandler(taskController.listTasks)
);
router.get(
  "/:taskId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(taskIdParamSchema),
  asyncHandler(taskController.getTaskById)
);
router.patch(
  "/:taskId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateTaskSchema),
  asyncHandler(taskController.updateTask)
);
router.patch(
  "/:taskId/status",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateTaskStatusSchema),
  asyncHandler(taskController.updateTaskStatus)
);

export default router;

