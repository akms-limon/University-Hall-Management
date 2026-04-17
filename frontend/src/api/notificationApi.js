import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const notificationApi = {
  async listMine(params) {
    const { data } = await httpClient.get("/notifications", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async unreadCount() {
    const { data } = await httpClient.get("/notifications/unread-count");
    return data.data;
  },

  async markRead(notificationId) {
    const { data } = await httpClient.patch(`/notifications/${notificationId}/read`);
    return data.data;
  },

  async markAllRead() {
    const { data } = await httpClient.patch("/notifications/read-all");
    return data.data;
  },
};
