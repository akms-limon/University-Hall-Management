import { httpClient } from "@/api/httpClient";

export const authApi = {
  async register(payload) {
    const { data } = await httpClient.post("/auth/register", payload);
    return data.data;
  },

  async login(payload) {
    const { data } = await httpClient.post("/auth/login", payload);
    return data.data;
  },

  async me() {
    const { data } = await httpClient.get("/auth/me");
    return data.data;
  },

  async logout() {
    const { data } = await httpClient.post("/auth/logout");
    return data;
  },
};

