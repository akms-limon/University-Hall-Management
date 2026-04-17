import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const roomApi = {
  async listRooms(params) {
    const { data } = await httpClient.get("/rooms", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getRoomById(roomId) {
    const { data } = await httpClient.get(`/rooms/${roomId}`);
    return data.data;
  },

  async createRoom(payload) {
    const { data } = await httpClient.post("/rooms", payload);
    return data.data;
  },

  async updateRoomById(roomId, payload) {
    const { data } = await httpClient.patch(`/rooms/${roomId}`, payload);
    return data.data;
  },

  async updateRoomStatus(roomId, isActive) {
    const { data } = await httpClient.patch(`/rooms/${roomId}/status`, { isActive });
    return data.data;
  },

  async listPublicRooms(params) {
    const { data } = await httpClient.get("/rooms/public", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getPublicRoomById(roomId) {
    const { data } = await httpClient.get(`/rooms/public/${roomId}`);
    return data.data;
  },
};
