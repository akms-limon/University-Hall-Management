import { httpClient } from "@/api/httpClient";

export const userApi = {
  async getMyProfile() {
    const { data } = await httpClient.get("/users/me");
    return data.data;
  },

  async updateMyProfile(payload) {
    const { data } = await httpClient.patch("/users/me", payload);
    return data.data;
  },
};
