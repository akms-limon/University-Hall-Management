import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const staffApi = {
  async listStaff(params) {
    const { data } = await httpClient.get("/staffs", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getStaffById(staffRecordId) {
    const { data } = await httpClient.get(`/staffs/${staffRecordId}`);
    return data.data;
  },

  async createStaff(payload) {
    const { data } = await httpClient.post("/staffs", payload);
    return data.data;
  },

  async updateStaffById(staffRecordId, payload) {
    const { data } = await httpClient.patch(`/staffs/${staffRecordId}`, payload);
    return data.data;
  },

  async updateStaffStatus(staffRecordId, isActive) {
    const { data } = await httpClient.patch(`/staffs/${staffRecordId}/status`, { isActive });
    return data.data;
  },

  async getMyProfile() {
    const { data } = await httpClient.get("/staffs/me");
    return data.data;
  },

  async updateMyProfile(payload) {
    const { data } = await httpClient.patch("/staffs/me", payload);
    return data.data;
  },
};
