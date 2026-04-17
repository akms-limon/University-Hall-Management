import { StatusCodes } from "http-status-codes";
import { notificationService } from "../services/notificationService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const notificationController = {
  async listMyNotifications(req, res) {
    const result = await notificationService.listMyNotifications(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Notifications fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getMyUnreadCount(req, res) {
    const summary = await notificationService.getMyUnreadCount(req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Unread notification count fetched successfully",
        data: summary,
      })
    );
  },

  async markMyNotificationRead(req, res) {
    const notification = await notificationService.markMyNotificationRead(req.user, req.params.notificationId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Notification marked as read",
        data: { notification },
      })
    );
  },

  async markAllMyNotificationsRead(req, res) {
    const result = await notificationService.markAllMyNotificationsRead(req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "All notifications marked as read",
        data: result,
      })
    );
  },
};
