import { httpClient } from "@/api/httpClient";

export const imageRecordApi = {
  async listImageRecords(params = {}) {
    const { data } = await httpClient.get("/image-records", { params });
    return data.data;
  },

  async getImageRecordById(imageId) {
    const { data } = await httpClient.get(`/image-records/${imageId}`);
    return data.data;
  },

  async createImageRecord(payload) {
    const formData = new FormData();
    formData.append("title", payload.title || "");
    formData.append("description", payload.description || "");
    formData.append("image", payload.imageFile);

    const { data } = await httpClient.post("/image-records", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data.data;
  },

  async updateImageRecord(imageId, payload) {
    const formData = new FormData();
    if (payload.title !== undefined) formData.append("title", payload.title);
    if (payload.description !== undefined) formData.append("description", payload.description);
    if (payload.imageFile) formData.append("image", payload.imageFile);

    const { data } = await httpClient.patch(`/image-records/${imageId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data.data;
  },

  async deleteImageRecord(imageId) {
    const { data } = await httpClient.delete(`/image-records/${imageId}`);
    return data.data;
  },
};

