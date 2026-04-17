import { env } from "../config/env.js";
import { PAYMENT_METHODS, TRANSACTION_STATUS } from "../models/Transaction.js";
import { paymentGatewayService } from "./paymentGatewayService.js";
import { sslcommerzService } from "./sslcommerzService.js";

function normalizeMethod(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["success", "completed", "complete", "paid"].includes(normalized)) {
    return TRANSACTION_STATUS.COMPLETED;
  }
  if (["failed", "fail", "error", "cancelled", "canceled"].includes(normalized)) {
    return TRANSACTION_STATUS.FAILED;
  }
  return TRANSACTION_STATUS.PENDING;
}

function gatewayProviderForMethod(method) {
  if (method === PAYMENT_METHODS.SSLCOMMERZ) return "sslcommerz";
  if (method === PAYMENT_METHODS.CASH) return "cash";
  if (method === PAYMENT_METHODS.SYSTEM) return "internal_wallet";
  if (method === PAYMENT_METHODS.BKASH) return "bkash";
  if (method === PAYMENT_METHODS.NAGAD) return "nagad";
  if (method === PAYMENT_METHODS.ROCKET) return "rocket";
  if (method === PAYMENT_METHODS.CARD) return "card";
  if (method === PAYMENT_METHODS.BANK_TRANSFER) return "bank_transfer";
  return "gateway";
}

function hasForcedFailure(remarks) {
  return String(remarks || "").includes("__PAYMENT_FAIL__");
}

export const paymentService = {
  normalizeCallbackStatus(statusValue) {
    return normalizeStatus(statusValue);
  },

  verifyCallbackSecret(incomingSecret = "") {
    const expectedSecret = String(env.PAYMENT_WEBHOOK_SECRET || "").trim();
    if (!expectedSecret) return true;
    return String(incomingSecret || "").trim() === expectedSecret;
  },

  async initializeDepositPayment({ transaction, student, actor, paymentMethod, remarks = "" }) {
    const method = normalizeMethod(paymentMethod);
    const provider = gatewayProviderForMethod(method);
    const forcedProvider = normalizeMethod(env.PAYMENT_PROVIDER);
    const shouldUseSslCommerz = method === PAYMENT_METHODS.SSLCOMMERZ || forcedProvider === "sslcommerz";

    if (hasForcedFailure(remarks)) {
      return {
        status: TRANSACTION_STATUS.FAILED,
        provider,
        providerReference: `fail-${Date.now()}`,
        paymentUrl: "",
        message: "Payment failed in simulation",
        raw: { simulated: true, forcedFailure: true },
      };
    }

    if (shouldUseSslCommerz) {
      if (!sslcommerzService.isConfigured()) {
        return {
          status: TRANSACTION_STATUS.FAILED,
          provider: "sslcommerz",
          providerReference: `sslcommerz-config-${Date.now()}`,
          paymentUrl: "",
          message: "SSLCommerz credentials or callback URLs are not configured",
          raw: { configured: false },
        };
      }

      const callbackUrls = {
        successUrl: String(env.SSLCOMMERZ_SUCCESS_URL || "").trim(),
        failUrl: String(env.SSLCOMMERZ_FAIL_URL || "").trim(),
        cancelUrl: String(env.SSLCOMMERZ_CANCEL_URL || "").trim(),
        ipnUrl: String(env.SSLCOMMERZ_IPN_URL || "").trim(),
      };

      if (!callbackUrls.successUrl || !callbackUrls.failUrl || !callbackUrls.cancelUrl || !callbackUrls.ipnUrl) {
        return {
          status: TRANSACTION_STATUS.FAILED,
          provider: "sslcommerz",
          providerReference: `sslcommerz-callback-${Date.now()}`,
          paymentUrl: "",
          message: "SSLCommerz callback URLs are missing in environment configuration",
          raw: { callbackUrls },
        };
      }

      const gatewayResult = await sslcommerzService.initiateDepositSession({
        transaction,
        customer: {
          id: student?.user?._id || student?.user?.id || actor?.id || "",
          name: student?.user?.name || actor?.name || "Student",
          email: student?.user?.email || actor?.email || "",
          phone: student?.user?.phone || "",
        },
        callbackUrls,
      });

      if (!gatewayResult.initiated || !gatewayResult.paymentUrl) {
        return {
          status: TRANSACTION_STATUS.FAILED,
          provider: "sslcommerz",
          providerReference: gatewayResult.providerReference || `sslcommerz-failed-${Date.now()}`,
          paymentUrl: "",
          message: gatewayResult.message || "Failed to initialize SSLCommerz payment session",
          raw: gatewayResult.raw || null,
        };
      }

      return {
        status: TRANSACTION_STATUS.PENDING,
        provider: "sslcommerz",
        providerReference: gatewayResult.providerReference || transaction.referenceId,
        paymentUrl: gatewayResult.paymentUrl,
        message: gatewayResult.message || "Redirect to SSLCommerz to complete payment",
        raw: {
          ...(gatewayResult.raw || {}),
          sessionKey: gatewayResult.sessionKey || "",
        },
      };
    }

    if (method === PAYMENT_METHODS.CASH || method === PAYMENT_METHODS.SYSTEM) {
      return {
        status: TRANSACTION_STATUS.COMPLETED,
        provider,
        providerReference: `${provider}-${Date.now()}`,
        paymentUrl: "",
        message: "Deposit completed",
        raw: { simulated: true, method },
      };
    }

    const gatewayResult = await paymentGatewayService.chargeMealOrder({
      amount: transaction.amount,
      currency: transaction.currency || "BDT",
      orderReference: transaction._id.toString(),
      customer: {
        id: student?.user?._id || student?.user?.id || actor?.id || "",
        name: student?.user?.name || actor?.name || "Student",
        email: student?.user?.email || actor?.email || "",
        phone: student?.user?.phone || "",
      },
      metadata: {
        paymentPurpose: "student_wallet_deposit",
        transactionId: transaction._id.toString(),
        studentId: student?.id || "",
        paymentMethod: method,
        remarks: String(remarks || ""),
      },
    });

    if (gatewayResult.success) {
      return {
        status: TRANSACTION_STATUS.COMPLETED,
        provider: gatewayResult.provider || provider,
        providerReference: gatewayResult.providerReference || `${provider}-${Date.now()}`,
        paymentUrl: gatewayResult.paymentUrl || "",
        message: gatewayResult.message || "Deposit completed",
        raw: gatewayResult.raw || null,
      };
    }

    if (gatewayResult.paymentUrl) {
      return {
        status: TRANSACTION_STATUS.PENDING,
        provider: gatewayResult.provider || provider,
        providerReference: gatewayResult.providerReference || `${provider}-${Date.now()}`,
        paymentUrl: gatewayResult.paymentUrl || "",
        message: gatewayResult.message || "Awaiting payment confirmation",
        raw: gatewayResult.raw || null,
      };
    }

    return {
      status: TRANSACTION_STATUS.FAILED,
      provider: gatewayResult.provider || provider,
      providerReference: gatewayResult.providerReference || `${provider}-failed-${Date.now()}`,
      paymentUrl: "",
      message: gatewayResult.message || "Payment failed",
      raw: gatewayResult.raw || null,
    };
  },
};
