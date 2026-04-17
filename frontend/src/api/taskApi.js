import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const taskApi = {
  async listAssignedTasks(params) {
    const { data } = await httpClient.get("/tasks/assigned", { params: compactParams(params) });
    return { ...data.data, meta: data.meta };
  },

  async getAssignedTaskById(taskId) {
    const { data } = await httpClient.get(`/tasks/assigned/${taskId}`);
    return data.data;
  },

  async updateAssignedTask(taskId, payload) {
    const { data } = await httpClient.patch(`/tasks/assigned/${taskId}`, payload);
    return data.data;
  },

  async createTask(payload) {
    const { data } = await httpClient.post("/tasks", payload);
    return data.data;
  },

  async listTasks(params) {
    const { data } = await httpClient.get("/tasks", { params: compactParams(params) });
    return { ...data.data, meta: data.meta };
  },

  async getTaskById(taskId) {
    const { data } = await httpClient.get(`/tasks/${taskId}`);
    return data.data;
  },

  async updateTask(taskId, payload) {
    const { data } = await httpClient.patch(`/tasks/${taskId}`, payload);
    return data.data;
  },

  async updateTaskStatus(taskId, payload) {
    const { data } = await httpClient.patch(`/tasks/${taskId}/status`, payload);
    return data.data;
  },
};

