import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const roomAllocationApi = {
  async createMyRequest(payload) {
    const { data } = await httpClient.post("/room-allocations/me", payload);
    return data.data;
  },

  async listMyAllocations(params) {
    const { data } = await httpClient.get("/room-allocations/me", {
      params: compactParams(params),
    });
    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getMyLatestAllocation() {
    const { data } = await httpClient.get("/room-allocations/me/latest");
    return data.data;
  },

  async getMyAllocationById(allocationId) {
    const { data } = await httpClient.get(`/room-allocations/me/${allocationId}`);
    return data.data;
  },

  async listAllocations(params) {
    const { data } = await httpClient.get("/room-allocations", {
      params: compactParams(params),
    });
    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getAllocationById(allocationId) {
    const { data } = await httpClient.get(`/room-allocations/${allocationId}`);
    return data.data;
  },

  async approveAllocation(allocationId, payload = {}) {
    const { data } = await httpClient.patch(`/room-allocations/${allocationId}/approve`, payload);
    return data.data;
  },

  async rejectAllocation(allocationId, payload) {
    const { data } = await httpClient.patch(`/room-allocations/${allocationId}/reject`, payload);
    return data.data;
  },

  async activateAllocation(allocationId, payload = {}) {
    const { data } = await httpClient.patch(`/room-allocations/${allocationId}/activate`, payload);
    return data.data;
  },

  async completeAllocation(allocationId, payload = {}) {
    const { data } = await httpClient.patch(`/room-allocations/${allocationId}/complete`, payload);
    return data.data;
  },

  async transferAllocation(allocationId, payload) {
    const { data } = await httpClient.patch(`/room-allocations/${allocationId}/transfer`, payload);
    return data.data;
  },
};
