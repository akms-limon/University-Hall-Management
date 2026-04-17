import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const maintenanceApi = {
  async createMyMaintenance(payload) {
    const { data } = await httpClient.post("/maintenance/me", payload);
    return data.data;
  },

  async listMyMaintenance(params) {
    const { data } = await httpClient.get("/maintenance/me", {
      params: compactParams(params),
    });
    return { ...data.data, meta: data.meta };
  },

  async getMyMaintenanceById(maintenanceId) {
    const { data } = await httpClient.get(`/maintenance/me/${maintenanceId}`);
    return data.data;
  },

  async listAssignedMaintenance(params) {
    const { data } = await httpClient.get("/maintenance/assigned", {
      params: compactParams(params),
    });
    return { ...data.data, meta: data.meta };
  },

  async getAssignedMaintenanceById(maintenanceId) {
    const { data } = await httpClient.get(`/maintenance/assigned/${maintenanceId}`);
    return data.data;
  },

  async updateAssignedMaintenance(maintenanceId, payload) {
    const { data } = await httpClient.patch(`/maintenance/assigned/${maintenanceId}`, payload);
    return data.data;
  },

  async listMaintenance(params) {
    const { data } = await httpClient.get("/maintenance", {
      params: compactParams(params),
    });
    return { ...data.data, meta: data.meta };
  },

  async getMaintenanceById(maintenanceId) {
    const { data } = await httpClient.get(`/maintenance/${maintenanceId}`);
    return data.data;
  },

  async assignMaintenance(maintenanceId, staffId) {
    const { data } = await httpClient.patch(`/maintenance/${maintenanceId}/assign`, { staffId });
    return data.data;
  },

  async updateMaintenanceStatus(maintenanceId, status) {
    const { data } = await httpClient.patch(`/maintenance/${maintenanceId}/status`, { status });
    return data.data;
  },
};
