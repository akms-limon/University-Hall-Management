import { StatusCodes } from "http-status-codes";
import { hallApplicationService } from "../services/hallApplicationService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const hallApplicationController = {
  async submitMyApplication(req, res) {
    const application = await hallApplicationService.submitMyApplication(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Hall application submitted successfully",
        data: { application },
      })
    );
  },

  async listMyApplications(req, res) {
    const result = await hallApplicationService.listMyApplications(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Hall applications fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getMyLatestApplication(req, res) {
    const application = await hallApplicationService.getMyLatestApplication(req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Latest hall application fetched successfully",
        data: { application },
      })
    );
  },

  async getMyApplicationById(req, res) {
    const application = await hallApplicationService.getMyApplicationById(req.user, req.params.applicationId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Hall application fetched successfully",
        data: { application },
      })
    );
  },

  async updateMyApplication(req, res) {
    const application = await hallApplicationService.updateMyApplication(
      req.user,
      req.params.applicationId,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Hall application updated successfully",
        data: { application },
      })
    );
  },

  async listHallApplications(req, res) {
    const result = await hallApplicationService.listHallApplications(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Hall applications fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getHallApplicationById(req, res) {
    const application = await hallApplicationService.getHallApplicationById(req.params.applicationId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Hall application fetched successfully",
        data: { application },
      })
    );
  },

  async updateReview(req, res) {
    const application = await hallApplicationService.updateReview(req.params.applicationId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Application review updated successfully",
        data: { application },
      })
    );
  },

  async updateStatus(req, res) {
    const application = await hallApplicationService.updateStatus(req.params.applicationId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Application status updated successfully",
        data: { application },
      })
    );
  },

  async scheduleMeeting(req, res) {
    const application = await hallApplicationService.scheduleMeeting(req.params.applicationId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Meeting scheduled successfully",
        data: { application },
      })
    );
  },

  async approveApplication(req, res) {
    const application = await hallApplicationService.approveApplication(
      req.params.applicationId,
      req.user,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Application approved successfully",
        data: { application },
      })
    );
  },

  async rejectApplication(req, res) {
    const application = await hallApplicationService.rejectApplication(req.params.applicationId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Application rejected successfully",
        data: { application },
      })
    );
  },

  async waitlistApplication(req, res) {
    const application = await hallApplicationService.waitlistApplication(
      req.params.applicationId,
      req.user,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Application waitlisted successfully",
        data: { application },
      })
    );
  },
};
