import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const hallApplicationApi = {
  async submitMyApplication(payload) {
    const { data } = await httpClient.post("/hall-applications/me", payload);
    return data.data;
  },

  async listMyApplications(params) {
    const { data } = await httpClient.get("/hall-applications/me", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getMyLatestApplication() {
    const { data } = await httpClient.get("/hall-applications/me/latest");
    return data.data;
  },

  async getMyApplicationById(applicationId) {
    const { data } = await httpClient.get(`/hall-applications/me/${applicationId}`);
    return data.data;
  },

  async updateMyApplication(applicationId, payload) {
    const { data } = await httpClient.patch(`/hall-applications/me/${applicationId}`, payload);
    return data.data;
  },

  async listHallApplications(params) {
    const { data } = await httpClient.get("/hall-applications", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getHallApplicationById(applicationId) {
    const { data } = await httpClient.get(`/hall-applications/${applicationId}`);
    return data.data;
  },

  async updateHallApplicationReview(applicationId, payload) {
    const { data } = await httpClient.patch(`/hall-applications/${applicationId}/review`, payload);
    return data.data;
  },

  async updateHallApplicationStatus(applicationId, payload) {
    const { data } = await httpClient.patch(`/hall-applications/${applicationId}/status`, payload);
    return data.data;
  },

  async scheduleMeeting(applicationId, payload) {
    const { data } = await httpClient.patch(`/hall-applications/${applicationId}/schedule-meeting`, payload);
    return data.data;
  },

  async approveApplication(applicationId, payload = {}) {
    const { data } = await httpClient.patch(`/hall-applications/${applicationId}/approve`, payload);
    return data.data;
  },

  async rejectApplication(applicationId, payload) {
    const { data } = await httpClient.patch(`/hall-applications/${applicationId}/reject`, payload);
    return data.data;
  },

  async waitlistApplication(applicationId, payload = {}) {
    const { data } = await httpClient.patch(`/hall-applications/${applicationId}/waitlist`, payload);
    return data.data;
  },
};
