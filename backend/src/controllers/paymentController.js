import { StatusCodes } from "http-status-codes";
import { walletService } from "../services/walletService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const paymentController = {
  async paymentCallbackHandler(req, res) {
    const callbackSecret =
      req.headers["x-payment-webhook-secret"] ||
      req.headers["x-wallet-callback-secret"] ||
      "";
    const transaction = await walletService.handleDepositCallback(req.body, callbackSecret);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Payment callback processed",
        data: { transaction },
      })
    );
  },
};

