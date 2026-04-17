import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const noticeApi = {
  async listMine(params) {
    const { data } = await httpClient.get("/notices/me", {
      params: compactParams(params),
    });
    return { ...data.data, meta: data.meta };
  },

  async getMyNoticeById(noticeId) {
    const { data } = await httpClient.get(`/notices/me/${noticeId}`);
    return data.data;
  },

  async createNotice(payload) {
    const { data } = await httpClient.post("/notices", payload);
    return data.data;
  },

  async listNotices(params) {
    const { data } = await httpClient.get("/notices", {
      params: compactParams(params),
    });
    return { ...data.data, meta: data.meta };
  },

  async getNoticeById(noticeId) {
    const { data } = await httpClient.get(`/notices/${noticeId}`);
    return data.data;
  },

  async updateNotice(noticeId, payload) {
    const { data } = await httpClient.patch(`/notices/${noticeId}`, payload);
    return data.data;
  },

  async publishNotice(noticeId) {
    const { data } = await httpClient.patch(`/notices/${noticeId}/publish`);
    return data.data;
  },

  async setNoticeActive(noticeId, isActive) {
    const { data } = await httpClient.patch(`/notices/${noticeId}/active`, { isActive });
    return data.data;
  },
};

