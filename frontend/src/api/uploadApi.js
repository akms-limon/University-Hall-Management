import { httpClient } from "@/api/httpClient";

export const uploadApi = {
  async uploadFiles(files) {
    const selected = Array.from(files || []).filter(Boolean);
    if (!selected.length) {
      return { files: [], urls: [] };
    }

    const formData = new FormData();
    selected.forEach((file) => {
      formData.append("files", file);
    });

    const { data } = await httpClient.post("/uploads", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data.data;
  },

  async uploadSingleFile(file) {
    const result = await this.uploadFiles(file ? [file] : []);
    return result.files?.[0]?.path || result.urls?.[0] || "";
  },
};
