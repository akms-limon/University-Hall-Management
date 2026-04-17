import { StatusCodes } from "http-status-codes";
import { noticeService } from "../services/noticeService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const noticeController = {
  async createNotice(req, res) {
    const notice = await noticeService.createNotice(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Notice created successfully",
        data: { notice },
      })
    );
  },

  async updateNotice(req, res) {
    const notice = await noticeService.updateNotice(req.params.noticeId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Notice updated successfully",
        data: { notice },
      })
    );
  },

  async publishNotice(req, res) {
    const notice = await noticeService.publishNotice(req.params.noticeId, req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Notice published successfully",
        data: { notice },
      })
    );
  },

  async setNoticeActive(req, res) {
    const notice = await noticeService.setNoticeActive(req.params.noticeId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Notice status updated successfully",
        data: { notice },
      })
    );
  },

  async listNotices(req, res) {
    const result = await noticeService.listNotices(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Notices fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getNoticeById(req, res) {
    const notice = await noticeService.getNoticeById(req.params.noticeId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Notice fetched successfully",
        data: { notice },
      })
    );
  },

  async listMyNotices(req, res) {
    const result = await noticeService.listMyNotices(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Notices fetched successfully",
        data: {
          items: result.items,
        },
        meta: result.meta,
      })
    );
  },

  async getMyNoticeById(req, res) {
    const notice = await noticeService.getMyNoticeById(req.user, req.params.noticeId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Notice fetched successfully",
        data: { notice },
      })
    );
  },
};

