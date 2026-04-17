import { StatusCodes } from "http-status-codes";
import { staffService } from "../services/staffService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const staffController = {
  async createStaff(req, res) {
    const staff = await staffService.createStaff(req.body, req.user);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Staff created successfully",
        data: { staff },
      })
    );
  },

  async listStaff(req, res) {
    const result = await staffService.listStaff(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Staff fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getStaffById(req, res) {
    const staff = await staffService.getStaffById(req.params.staffRecordId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Staff fetched successfully",
        data: { staff },
      })
    );
  },

  async updateStaffById(req, res) {
    const staff = await staffService.updateStaffById(req.params.staffRecordId, req.body, req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Staff updated successfully",
        data: { staff },
      })
    );
  },

  async updateStaffStatus(req, res) {
    const staff = await staffService.updateStaffStatus(req.params.staffRecordId, req.body.isActive, req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: req.body.isActive ? "Staff activated successfully" : "Staff deactivated successfully",
        data: { staff },
      })
    );
  },

  async getMyProfile(req, res) {
    const staff = await staffService.getMyStaffProfile(req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Staff profile fetched successfully",
        data: { staff },
      })
    );
  },

  async updateMyProfile(req, res) {
    const staff = await staffService.updateMyStaffProfile(req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Staff profile updated successfully",
        data: { staff },
      })
    );
  },
};
