import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, registerSchema } from "../validations/authValidation.js";

const router = Router();

router.post("/register", validateRequest(registerSchema), asyncHandler(authController.register));
router.post("/login", validateRequest(loginSchema), asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", requireAuth, asyncHandler(authController.me));

export default router;
