import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import { walletController } from "../controllers/walletController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createDepositRequestSchema,
  diningDateSummarySchema,
  diningTodaySummarySchema,
  listMyTransactionsSchema,
  listProvostTransactionsSchema,
  paymentCallbackSchema,
  provostFinancialSummarySchema,
  transactionIdParamSchema,
} from "../validations/walletValidation.js";

const router = Router();

router.post(
  "/deposits/callback",
  validateRequest(paymentCallbackSchema),
  asyncHandler(walletController.handleDepositCallback)
);
router
  .route("/deposits/sslcommerz/success")
  .get(asyncHandler(walletController.handleSslCommerzSuccess))
  .post(asyncHandler(walletController.handleSslCommerzSuccess));
router
  .route("/deposits/sslcommerz/fail")
  .get(asyncHandler(walletController.handleSslCommerzFail))
  .post(asyncHandler(walletController.handleSslCommerzFail));
router
  .route("/deposits/sslcommerz/cancel")
  .get(asyncHandler(walletController.handleSslCommerzCancel))
  .post(asyncHandler(walletController.handleSslCommerzCancel));
router
  .route("/deposits/sslcommerz/ipn")
  .post(asyncHandler(walletController.handleSslCommerzIpn));

router.use(requireAuth);

router.get(
  "/me/balance",
  authorize(USER_ROLES.STUDENT),
  asyncHandler(walletController.getMyBalance)
);
router.get(
  "/me/transactions",
  authorize(USER_ROLES.STUDENT),
  validateRequest(listMyTransactionsSchema),
  asyncHandler(walletController.listMyTransactions)
);
router.post(
  "/me/deposits",
  authorize(USER_ROLES.STUDENT),
  validateRequest(createDepositRequestSchema),
  asyncHandler(walletController.createDepositRequest)
);
router.get(
  "/me/deposits/:transactionId",
  authorize(USER_ROLES.STUDENT),
  validateRequest(transactionIdParamSchema),
  asyncHandler(walletController.getMyDepositStatus)
);

router.get(
  "/dining/today-summary",
  authorize(USER_ROLES.STAFF),
  validateRequest(diningTodaySummarySchema),
  asyncHandler(walletController.getDiningTodaySummary)
);
router.get(
  "/dining/date-summary",
  authorize(USER_ROLES.STAFF),
  validateRequest(diningDateSummarySchema),
  asyncHandler(walletController.getDiningDateSummary)
);

router.get(
  "/provost/transactions",
  authorize(USER_ROLES.PROVOST),
  validateRequest(listProvostTransactionsSchema),
  asyncHandler(walletController.listProvostTransactions)
);
router.get(
  "/provost/summary",
  authorize(USER_ROLES.PROVOST),
  validateRequest(provostFinancialSummarySchema),
  asyncHandler(walletController.getProvostFinancialSummary)
);

export default router;
