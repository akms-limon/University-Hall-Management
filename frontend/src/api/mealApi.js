import { httpClient } from "@/api/httpClient";

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export const mealApi = {
  async listDailyMenu(params) {
    const { data } = await httpClient.get("/meals/menu", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getMealItemById(itemId) {
    const { data } = await httpClient.get(`/meals/menu/${itemId}`);
    return data.data;
  },

  async createMealOrder(payload) {
    const { data } = await httpClient.post("/meals/orders/me", payload);
    return data.data;
  },

  async listMyMealOrders(params) {
    const { data } = await httpClient.get("/meals/orders/me", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getMyMealOrderById(orderId) {
    const { data } = await httpClient.get(`/meals/orders/me/${orderId}`);
    return data.data;
  },

  async cancelMyMealOrder(orderId, payload = {}) {
    const { data } = await httpClient.patch(`/meals/orders/me/${orderId}/cancel`, payload);
    return data.data;
  },

  async createMealItem(payload) {
    const { data } = await httpClient.post("/meals/staff/menu", payload);
    return data.data;
  },

  async listMealItemsForStaff(params) {
    const { data } = await httpClient.get("/meals/staff/menu", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getMealItemByIdForStaff(itemId) {
    const { data } = await httpClient.get(`/meals/staff/menu/${itemId}`);
    return data.data;
  },

  async updateMealItem(itemId, payload) {
    const { data } = await httpClient.patch(`/meals/staff/menu/${itemId}`, payload);
    return data.data;
  },

  async deleteMealItem(itemId) {
    const { data } = await httpClient.delete(`/meals/staff/menu/${itemId}`);
    return data.data;
  },

  async updateMealItemAvailability(itemId, isAvailable) {
    const { data } = await httpClient.patch(`/meals/staff/menu/${itemId}/availability`, { isAvailable });
    return data.data;
  },

  async listMealOrdersForStaff(params) {
    const { data } = await httpClient.get("/meals/staff/orders", {
      params: compactParams(params),
    });

    return {
      ...data.data,
      meta: data.meta,
    };
  },

  async getMealOrderByIdForStaff(orderId) {
    const { data } = await httpClient.get(`/meals/staff/orders/${orderId}`);
    return data.data;
  },

  async updateMealOrderStatus(orderId, payload) {
    const { data } = await httpClient.patch(`/meals/staff/orders/${orderId}/status`, payload);
    return data.data;
  },

  async getTodayMealStats(params) {
    const { data } = await httpClient.get("/meals/staff/stats/today", {
      params: compactParams(params),
    });
    return data.data;
  },

  async getDateWiseMealStats(params) {
    const { data } = await httpClient.get("/meals/staff/stats/date-wise", {
      params: compactParams(params),
    });
    return data.data;
  },

  async getProvostMealReports(params) {
    const { data } = await httpClient.get("/meals/provost/reports", {
      params: compactParams(params),
    });
    return data.data;
  },
};
