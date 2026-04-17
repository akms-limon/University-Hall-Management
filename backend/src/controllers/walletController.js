import { StatusCodes } from "http-status-codes";
import { walletService } from "../services/walletService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const walletController = {
  async getMyBalance(req, res) {
    const balance = await walletService.getMyBalance(req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Wallet balance fetched successfully",
        data: { balance },
      })
    );
  },

  async listMyTransactions(req, res) {
    const result = await walletService.listMyTransactions(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Transaction history fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async createDepositRequest(req, res) {
    const result = await walletService.createDepositRequest(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Deposit request processed",
        data: {
          transaction: result.transaction,
          payment: result.payment,
        },
      })
    );
  },

  async getMyDepositStatus(req, res) {
    const transaction = await walletService.getMyDepositStatus(req.user, req.params.transactionId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Deposit status fetched successfully",
        data: { transaction },
      })
    );
  },

  async handleDepositCallback(req, res) {
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

  async handleSslCommerzSuccess(req, res) {
    const payload = { ...req.query, ...req.body };
    const result = await walletService.handleSslCommerzGatewayReturn("success", payload);

    if (result.redirectUrl) {
      return res.redirect(302, result.redirectUrl);
    }

    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: result.message,
        data: {
          status: result.status,
          transaction: result.transaction,
        },
      })
    );
  },

  async handleSslCommerzFail(req, res) {
    const payload = { ...req.query, ...req.body };
    const result = await walletService.handleSslCommerzGatewayReturn("fail", payload);

    if (result.redirectUrl) {
      return res.redirect(302, result.redirectUrl);
    }

    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: result.message,
        data: {
          status: result.status,
          transaction: result.transaction,
        },
      })
    );
  },

  async handleSslCommerzCancel(req, res) {
    const payload = { ...req.query, ...req.body };
    const result = await walletService.handleSslCommerzGatewayReturn("cancel", payload);

    if (result.redirectUrl) {
      return res.redirect(302, result.redirectUrl);
    }

    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: result.message,
        data: {
          status: result.status,
          transaction: result.transaction,
        },
      })
    );
  },

  async handleSslCommerzIpn(req, res) {
    const result = await walletService.handleSslCommerzIpn(req.body || {});
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "SSLCommerz IPN processed",
        data: {
          status: result.status,
          transaction: result.transaction,
        },
      })
    );
  },

  async getDiningTodaySummary(req, res) {
    const result = await walletService.getDiningTodaySummary(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Dining today summary fetched successfully",
        data: { summary: result.summary, date: result.date },
      })
    );
  },

  async getDiningDateSummary(req, res) {
    const result = await walletService.getDiningDateSummary(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Dining date summary fetched successfully",
        data: {
          items: result.items,
          range: result.range,
        },
      })
    );
  },

  async listProvostTransactions(req, res) {
    const result = await walletService.listProvostTransactions(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Transactions fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getProvostFinancialSummary(req, res) {
    const result = await walletService.getProvostFinancialSummary(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Financial summary fetched successfully",
        data: {
          overview: result.overview,
          dailyRevenue: result.dailyRevenue,
          range: result.range,
        },
      })
    );
  },
};
