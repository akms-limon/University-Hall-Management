import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { studentController } from "../controllers/studentController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createStudentSchema,
  listStudentsSchema,
  studentIdParamSchema,
  updateMyStudentProfileSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
} from "../validations/studentValidation.js";

const router = Router();

router.use(requireAuth);

router.get("/me", authorize(USER_ROLES.STUDENT), asyncHandler(studentController.getMyProfile));
router.patch(
  "/me",
  authorize(USER_ROLES.STUDENT),
  validateRequest(updateMyStudentProfileSchema),
  asyncHandler(studentController.updateMyProfile)
);

router.post(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(createStudentSchema),
  asyncHandler(studentController.createStudent)
);
router.get(
  "/",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listStudentsSchema),
  asyncHandler(studentController.listStudents)
);
router.get(
  "/:studentId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(studentIdParamSchema),
  asyncHandler(studentController.getStudentById)
);
router.patch(
  "/:studentId",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateStudentSchema),
  asyncHandler(studentController.updateStudentById)
);
router.patch(
  "/:studentId/status",
  authorize(USER_ROLES.PROVOST),
  validateRequest(updateStudentStatusSchema),
  asyncHandler(studentController.updateStudentStatus)
);

export default router;
