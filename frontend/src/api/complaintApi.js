import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const complaintApi = {
  async createMyComplaint(payload) {
    const { data } = await httpClient.post("/complaints/me", payload);
    return data.data;
  },

  async listMyComplaints(params) {
    const { data } = await httpClient.get("/complaints/me", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getMyComplaintById(complaintId) {
    const { data } = await httpClient.get(`/complaints/me/${complaintId}`);
    return data.data;
  },

  async addMyFeedback(complaintId, payload) {
    const { data } = await httpClient.patch(`/complaints/me/${complaintId}/feedback`, payload);
    return data.data;
  },

  async listAssignedComplaints(params) {
    const { data } = await httpClient.get("/complaints/assigned", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getAssignedComplaintById(complaintId) {
    const { data } = await httpClient.get(`/complaints/assigned/${complaintId}`);
    return data.data;
  },

  async updateAssignedComplaint(complaintId, payload) {
    const { data } = await httpClient.patch(`/complaints/assigned/${complaintId}`, payload);
    return data.data;
  },

  async listComplaints(params) {
    const { data } = await httpClient.get("/complaints", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getComplaintById(complaintId) {
    const { data } = await httpClient.get(`/complaints/${complaintId}`);
    return data.data;
  },

  async assignComplaint(complaintId, staffId) {
    const { data } = await httpClient.patch(`/complaints/${complaintId}/assign`, { staffId });
    return data.data;
  },

  async updateComplaintStatus(complaintId, payload) {
    const { data } = await httpClient.patch(`/complaints/${complaintId}/status`, payload);
    return data.data;
  },
};
