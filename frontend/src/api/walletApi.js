import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const walletApi = {
  async getMyBalance() {
    const { data } = await httpClient.get("/wallet/me/balance");
    return data.data;
  },

  async listMyTransactions(params) {
    const { data } = await httpClient.get("/wallet/me/transactions", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async createDepositRequest(payload) {
    const { data } = await httpClient.post("/wallet/me/deposits", payload);
    return data.data;
  },

  async getMyDepositStatus(transactionId) {
    const { data } = await httpClient.get(`/wallet/me/deposits/${transactionId}`);
    return data.data;
  },

  async getDiningTodaySummary(params) {
    const { data } = await httpClient.get("/dining/today-summary", {
      params: compactParams(params),
    });
    return data.data;
  },

  async getDiningDateSummary(params) {
    const { data } = await httpClient.get("/dining/date-summary", {
      params: compactParams(params),
    });
    return data.data;
  },

  async listProvostTransactions(params) {
    const { data } = await httpClient.get("/wallet/provost/transactions", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getProvostFinancialSummary(params) {
    const { data } = await httpClient.get("/wallet/provost/summary", {
      params: compactParams(params),
    });
    return data.data;
  },
};
