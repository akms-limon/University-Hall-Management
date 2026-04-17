import { Router } from "express";
import { paymentController } from "../controllers/paymentController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { paymentCallbackSchema } from "../validations/walletValidation.js";

const router = Router();

router.post(
  "/callback",
  validateRequest(paymentCallbackSchema),
  asyncHandler(paymentController.paymentCallbackHandler)
);

export default router;

