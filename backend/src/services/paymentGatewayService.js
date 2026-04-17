import { env } from "../config/env.js";

function normalizeProvider() {
  return String(env.PAYMENT_PROVIDER || "sandbox").trim().toLowerCase();
}

function withTrailingSlashRemoved(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getGatewayHeaders() {
  return {
    "Content-Type": "application/json",
    ...(env.PAYMENT_API_KEY ? { "x-api-key": env.PAYMENT_API_KEY } : {}),
    ...(env.PAYMENT_API_SECRET ? { "x-api-secret": env.PAYMENT_API_SECRET } : {}),
  };
}

function hasSandboxFailureHint(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  if (metadata.forcePaymentFailure === true) {
    return true;
  }

  return String(metadata.specialRequests || "").includes("__PAYMENT_FAIL__");
}

async function callGateway(path, payload) {
  const baseUrl = withTrailingSlashRemoved(env.PAYMENT_API_BASE_URL);
  if (!baseUrl) {
    return {
      ok: false,
      data: {
        success: false,
        message: "Payment gateway endpoint is not configured",
      },
    };
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: getGatewayHeaders(),
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        success: false,
        message: text || "Invalid payment gateway response",
      };
    }

    return {
      ok: response.ok,
      data: data || {
        success: false,
        message: "Empty payment gateway response",
      },
    };
  } catch {
    return {
      ok: false,
      data: {
        success: false,
        message: "Payment gateway request failed",
      },
    };
  }
}

function buildChargeResult(provider, rawResult) {
  const data = rawResult?.data || {};
  const success =
    Boolean(data.success) ||
    data.status === "success" ||
    data.paymentStatus === "paid" ||
    data.paid === true;
  const providerReference =
    String(data.reference || data.transactionId || data.providerReference || "").trim() ||
    `${provider}-${Date.now()}`;

  return {
    success,
    provider,
    providerReference,
    paymentUrl: String(data.paymentUrl || data.redirectUrl || "").trim(),
    message: String(data.message || (success ? "Payment successful" : "Payment failed")).trim(),
    raw: data,
  };
}

function buildRefundResult(provider, rawResult) {
  const data = rawResult?.data || {};
  const success =
    Boolean(data.success) ||
    data.status === "success" ||
    data.refundStatus === "success" ||
    data.refunded === true;
  const providerReference =
    String(data.reference || data.transactionId || data.providerReference || "").trim() ||
    `${provider}-refund-${Date.now()}`;

  return {
    success,
    provider,
    providerReference,
    message: String(data.message || (success ? "Refund successful" : "Refund failed")).trim(),
    raw: data,
  };
}

export const paymentGatewayService = {
  async chargeMealOrder({ amount, currency = "BDT", orderReference, customer, metadata = null }) {
    const provider = normalizeProvider();

    if (provider === "sandbox" || provider === "mock") {
      const shouldFail = hasSandboxFailureHint(metadata);
      return {
        success: !shouldFail,
        provider,
        providerReference: `${provider}-${Date.now()}`,
        paymentUrl: "",
        message: shouldFail ? "Payment failed in sandbox gateway simulation" : "Sandbox payment successful",
        raw: {
          simulated: true,
        },
      };
    }

    if (provider === "internal_wallet") {
      return {
        success: true,
        provider,
        providerReference: `wallet-${Date.now()}`,
        paymentUrl: "",
        message: "Wallet payment successful",
        raw: {
          mode: "internal_wallet",
        },
      };
    }

    const response = await callGateway("/charges", {
      amount,
      currency,
      orderReference,
      customer,
      metadata,
    });

    return buildChargeResult(provider, response);
  },

  async refundMealOrder({
    amount,
    currency = "BDT",
    paymentReference = "",
    orderReference = "",
    metadata = null,
  }) {
    const provider = normalizeProvider();

    if (provider === "sandbox" || provider === "mock" || provider === "internal_wallet") {
      return {
        success: true,
        provider,
        providerReference: paymentReference || `${provider}-refund-${Date.now()}`,
        message: "Refund successful",
        raw: {
          simulated: true,
        },
      };
    }

    const response = await callGateway("/refunds", {
      amount,
      currency,
      paymentReference,
      orderReference,
      metadata,
    });

    return buildRefundResult(provider, response);
  },
};
