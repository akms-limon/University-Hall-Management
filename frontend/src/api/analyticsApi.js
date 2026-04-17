import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const analyticsApi = {
  async getProvostSummary(params) {
    const { data } = await httpClient.get("/analytics/provost/summary", {
      params: compactParams(params),
    });
    return data.data;
  },

  async getStaffDiningSummary(params) {
    const { data } = await httpClient.get("/analytics/staff/dining-summary", {
      params: compactParams(params),
    });
    return data.data;
  },
};
