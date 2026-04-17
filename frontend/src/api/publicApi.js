import { httpClient } from "@/api/httpClient";

export const publicApi = {
  async getHomepageData() {
    const { data } = await httpClient.get("/homepage");
    return data.data;
  },
};
