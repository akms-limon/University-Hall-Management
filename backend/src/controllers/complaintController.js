import { StatusCodes } from "http-status-codes";
import { complaintService } from "../services/complaintService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const complaintController = {
  async createMyComplaint(req, res) {
    const complaint = await complaintService.createMyComplaint(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Complaint submitted successfully",
        data: { complaint },
      })
    );
  },

  async listMyComplaints(req, res) {
    const result = await complaintService.listMyComplaints(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Complaints fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getMyComplaintById(req, res) {
    const complaint = await complaintService.getMyComplaintById(req.user, req.params.complaintId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Complaint fetched successfully",
        data: { complaint },
      })
    );
  },

  async addMyFeedback(req, res) {
    const complaint = await complaintService.addMyComplaintFeedback(req.user, req.params.complaintId, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Complaint feedback submitted successfully",
        data: { complaint },
      })
    );
  },

  async listAssignedComplaints(req, res) {
    const result = await complaintService.listAssignedComplaints(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Assigned complaints fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getAssignedComplaintById(req, res) {
    const complaint = await complaintService.getAssignedComplaintById(req.user, req.params.complaintId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Assigned complaint fetched successfully",
        data: { complaint },
      })
    );
  },

  async updateAssignedComplaint(req, res) {
    const complaint = await complaintService.updateAssignedComplaint(req.user, req.params.complaintId, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Complaint updated successfully",
        data: { complaint },
      })
    );
  },

  async listComplaints(req, res) {
    const result = await complaintService.listComplaints(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Complaints fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getComplaintById(req, res) {
    const complaint = await complaintService.getComplaintById(req.params.complaintId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Complaint fetched successfully",
        data: { complaint },
      })
    );
  },

  async assignComplaint(req, res) {
    const complaint = await complaintService.assignComplaint(req.params.complaintId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Complaint assigned successfully",
        data: { complaint },
      })
    );
  },

  async updateComplaintStatus(req, res) {
    const complaint = await complaintService.updateComplaintStatus(req.params.complaintId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Complaint status updated successfully",
        data: { complaint },
      })
    );
  },
};
