import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const studentApi = {
  async listStudents(params) {
    const { data } = await httpClient.get("/students", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getStudentById(studentId) {
    const { data } = await httpClient.get(`/students/${studentId}`);
    return data.data;
  },

  async createStudent(payload) {
    const { data } = await httpClient.post("/students", payload);
    return data.data;
  },

  async updateStudentById(studentId, payload) {
    const { data } = await httpClient.patch(`/students/${studentId}`, payload);
    return data.data;
  },

  async updateStudentStatus(studentId, isActive) {
    const { data } = await httpClient.patch(`/students/${studentId}/status`, { isActive });
    return data.data;
  },

  async getMyProfile() {
    const { data } = await httpClient.get("/students/me");
    return data.data;
  },

  async updateMyProfile(payload) {
    const { data } = await httpClient.patch("/students/me", payload);
    return data.data;
  },
};
