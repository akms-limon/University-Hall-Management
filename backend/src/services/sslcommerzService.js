import { env } from "../config/env.js";

function trimValue(value) {
  return String(value || "").trim();
}

function getBaseUrl() {
  const base = env.SSLCOMMERZ_IS_SANDBOX ? env.SSLCOMMERZ_SANDBOX_BASE_URL : env.SSLCOMMERZ_LIVE_BASE_URL;
  return trimValue(base).replace(/\/+$/, "");
}

function getStoreConfig() {
  return {
    storeId: trimValue(env.SSLCOMMERZ_STORE_ID),
    storePassword: trimValue(env.SSLCOMMERZ_STORE_PASSWORD),
  };
}

function getGatewayUrl(path) {
  return `${getBaseUrl()}${path}`;
}

function isConfigured() {
  const { storeId, storePassword } = getStoreConfig();
  return Boolean(storeId && storePassword && getBaseUrl());
}

function normalizeValidationStatus(value) {
  const status = trimValue(value).toUpperCase();
  return ["VALID", "VALIDATED", "SUCCESS"].includes(status);
}

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      status: "FAILED",
      message: text || "Invalid SSLCommerz response",
    };
  }
}

export const sslcommerzService = {
  isConfigured,

  async initiateDepositSession({ transaction, customer, callbackUrls }) {
    const { storeId, storePassword } = getStoreConfig();
    const payload = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: Number(transaction.amount || 0).toFixed(2),
      currency: transaction.currency || "BDT",
      tran_id: transaction.referenceId,
      success_url: callbackUrls.successUrl,
      fail_url: callbackUrls.failUrl,
      cancel_url: callbackUrls.cancelUrl,
      ipn_url: callbackUrls.ipnUrl,
      shipping_method: "NO",
      product_name: "Wallet Deposit",
      product_category: "Wallet",
      product_profile: "general",
      num_of_item: "1",
      cus_name: trimValue(customer?.name) || "Student",
      cus_email: trimValue(customer?.email) || "student@example.com",
      cus_add1: "University Hall",
      cus_city: "Jashore",
      cus_country: "Bangladesh",
      cus_phone: trimValue(customer?.phone) || "01700000000",
      value_a: transaction._id.toString(),
      value_b: trimValue(customer?.id),
      value_c: trimValue(transaction.student?.toString?.()),
      value_d: "wallet_deposit",
    });

    const response = await fetch(getGatewayUrl("/gwprocess/v4/api.php"), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    const data = await parseJsonResponse(response);
    const paymentUrl = trimValue(data.GatewayPageURL || data.redirectGatewayURL || data.redirect_url);
    const sessionKey = trimValue(data.sessionkey);
    const initiated =
      response.ok &&
      Boolean(paymentUrl) &&
      ["SUCCESS", "OK"].includes(trimValue(data.status).toUpperCase());

    return {
      initiated,
      paymentUrl,
      sessionKey,
      providerReference: sessionKey || transaction.referenceId,
      message: trimValue(data.failedreason || data.message) || (initiated ? "SSLCommerz session created" : "Failed to create SSLCommerz session"),
      raw: data,
    };
  },

  async validatePayment({ valId, tranId }) {
    const { storeId, storePassword } = getStoreConfig();
    const query = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      format: "json",
      ...(trimValue(valId) ? { val_id: trimValue(valId) } : {}),
      ...(trimValue(tranId) ? { tran_id: trimValue(tranId) } : {}),
    });

    const response = await fetch(getGatewayUrl(`/validator/api/validationserverAPI.php?${query.toString()}`), {
      method: "GET",
    });

    const data = await parseJsonResponse(response);
    const validationStatus = trimValue(data.status);

    return {
      isValid: response.ok && normalizeValidationStatus(validationStatus),
      status: validationStatus,
      amount: Number(data.amount || 0),
      currency: trimValue(data.currency || "BDT"),
      tranId: trimValue(data.tran_id || tranId),
      bankTranId: trimValue(data.bank_tran_id),
      valId: trimValue(data.val_id || valId),
      raw: data,
      message: trimValue(data.error || data.message || data.APIConnect || ""),
    };
  },
};

