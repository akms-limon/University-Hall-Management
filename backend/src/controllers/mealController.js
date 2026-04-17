import { StatusCodes } from "http-status-codes";
import { mealService } from "../services/mealService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const mealController = {
  async createMealItem(req, res) {
    const item = await mealService.createMealItem(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Meal item created successfully",
        data: { item },
      })
    );
  },

  async updateMealItem(req, res) {
    const item = await mealService.updateMealItem(req.params.itemId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal item updated successfully",
        data: { item },
      })
    );
  },

  async deleteMealItem(req, res) {
    const item = await mealService.deleteMealItem(req.params.itemId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal item deleted successfully",
        data: { item },
      })
    );
  },

  async updateMealItemAvailability(req, res) {
    const item = await mealService.updateMealItemAvailability(
      req.params.itemId,
      req.body.isAvailable,
      req.user
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal item availability updated successfully",
        data: { item },
      })
    );
  },

  async listDailyMenu(req, res) {
    const result = await mealService.listDailyMenu(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Daily menu fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async listMealItemsForStaff(req, res) {
    const result = await mealService.listMealItemsForStaff(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal menu fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getMealItemById(req, res) {
    const item = await mealService.getMealItemById(req.params.itemId, { staffView: false });
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal item fetched successfully",
        data: { item },
      })
    );
  },

  async getMealItemByIdForStaff(req, res) {
    const item = await mealService.getMealItemById(req.params.itemId, { staffView: true });
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal item fetched successfully",
        data: { item },
      })
    );
  },

  async createMealOrder(req, res) {
    const result = await mealService.createMealOrder(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Meal token purchased successfully",
        data: {
          order: result.order,
          paymentFailed: result.paymentFailed,
          payment: result.payment || null,
        },
      })
    );
  },

  async listMyMealOrders(req, res) {
    const result = await mealService.listMyMealOrders(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal tokens fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getMyMealOrderById(req, res) {
    const order = await mealService.getMealOrderById(req.params.orderId, req.user, { staffView: false });
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal token fetched successfully",
        data: { order },
      })
    );
  },

  async cancelMyMealOrder(req, res) {
    const order = await mealService.cancelMyMealOrder(req.user, req.params.orderId, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal token cancelled successfully",
        data: { order },
      })
    );
  },

  async listMealOrdersForStaff(req, res) {
    const result = await mealService.listMealOrdersForStaff(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal tokens fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getMealOrderByIdForStaff(req, res) {
    const order = await mealService.getMealOrderById(req.params.orderId, req.user, { staffView: true });
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal token fetched successfully",
        data: { order },
      })
    );
  },

  async updateMealOrderStatus(req, res) {
    const order = await mealService.updateMealOrderStatus(req.params.orderId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal token status updated successfully",
        data: { order },
      })
    );
  },

  async getTodayMealStats(req, res) {
    const stats = await mealService.getTodayMealStats(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Today's meal token statistics fetched successfully",
        data: { stats },
      })
    );
  },

  async getDateWiseMealStats(req, res) {
    const stats = await mealService.getDateWiseMealStats(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Date-wise meal token statistics fetched successfully",
        data: { stats },
      })
    );
  },

  async getProvostMealReports(req, res) {
    const reports = await mealService.getProvostMealReports(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meal token reports fetched successfully",
        data: { reports },
      })
    );
  },
};
