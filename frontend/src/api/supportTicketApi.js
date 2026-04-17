import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const supportTicketApi = {
  async createMyTicket(payload) {
    const { data } = await httpClient.post("/support-tickets/me", payload);
    return data.data;
  },

  async listMyTickets(params) {
    const { data } = await httpClient.get("/support-tickets/me", {
      params: compactParams(params),
    });
    return { ...data.data, meta: data.meta };
  },

  async getMyTicketById(ticketId) {
    const { data } = await httpClient.get(`/support-tickets/me/${ticketId}`);
    return data.data;
  },

  async addMyMessage(ticketId, payload) {
    const { data } = await httpClient.post(`/support-tickets/me/${ticketId}/messages`, payload);
    return data.data;
  },

  async listAssignedTickets(params) {
    const { data } = await httpClient.get("/support-tickets/assigned", {
      params: compactParams(params),
    });
    return { ...data.data, meta: data.meta };
  },

  async getAssignedTicketById(ticketId) {
    const { data } = await httpClient.get(`/support-tickets/assigned/${ticketId}`);
    return data.data;
  },

  async addAssignedMessage(ticketId, payload) {
    const { data } = await httpClient.post(`/support-tickets/assigned/${ticketId}/messages`, payload);
    return data.data;
  },

  async updateAssignedTicket(ticketId, payload) {
    const { data } = await httpClient.patch(`/support-tickets/assigned/${ticketId}`, payload);
    return data.data;
  },

  async listTickets(params) {
    const { data } = await httpClient.get("/support-tickets", {
      params: compactParams(params),
    });
    return { ...data.data, meta: data.meta };
  },

  async getTicketById(ticketId) {
    const { data } = await httpClient.get(`/support-tickets/${ticketId}`);
    return data.data;
  },

  async assignTicket(ticketId, staffId) {
    const { data } = await httpClient.patch(`/support-tickets/${ticketId}/assign`, { staffId });
    return data.data;
  },

  async updateTicketStatus(ticketId, payload) {
    const { data } = await httpClient.patch(`/support-tickets/${ticketId}/status`, payload);
    return data.data;
  },

  async addProvostMessage(ticketId, payload) {
    const { data } = await httpClient.post(`/support-tickets/${ticketId}/messages`, payload);
    return data.data;
  },
};

