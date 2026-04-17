import { StatusCodes } from "http-status-codes";
import { maintenanceService } from "../services/maintenanceService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const maintenanceController = {
  async createMyMaintenance(req, res) {
    const record = await maintenanceService.createMyMaintenance(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Maintenance request submitted successfully",
        data: { maintenance: record },
      })
    );
  },

  async listMyMaintenance(req, res) {
    const result = await maintenanceService.listMyMaintenance(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Maintenance requests fetched successfully",
        data: { items: result.items, summary: result.summary },
        meta: result.meta,
      })
    );
  },

  async getMyMaintenanceById(req, res) {
    const record = await maintenanceService.getMyMaintenanceById(
      req.user,
      req.params.maintenanceId
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Maintenance request fetched successfully",
        data: { maintenance: record },
      })
    );
  },

  async listAssignedMaintenance(req, res) {
    const result = await maintenanceService.listAssignedMaintenance(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Assigned maintenance requests fetched successfully",
        data: { items: result.items, summary: result.summary },
        meta: result.meta,
      })
    );
  },

  async getAssignedMaintenanceById(req, res) {
    const record = await maintenanceService.getAssignedMaintenanceById(
      req.user,
      req.params.maintenanceId
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Assigned maintenance request fetched successfully",
        data: { maintenance: record },
      })
    );
  },

  async updateAssignedMaintenance(req, res) {
    const record = await maintenanceService.updateAssignedMaintenance(
      req.user,
      req.params.maintenanceId,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Maintenance request updated successfully",
        data: { maintenance: record },
      })
    );
  },

  async listMaintenance(req, res) {
    const result = await maintenanceService.listMaintenance(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Maintenance requests fetched successfully",
        data: { items: result.items, summary: result.summary },
        meta: result.meta,
      })
    );
  },

  async getMaintenanceById(req, res) {
    const record = await maintenanceService.getMaintenanceById(req.params.maintenanceId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Maintenance request fetched successfully",
        data: { maintenance: record },
      })
    );
  },

  async assignMaintenance(req, res) {
    const record = await maintenanceService.assignMaintenance(
      req.params.maintenanceId,
      req.user,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Maintenance request assigned successfully",
        data: { maintenance: record },
      })
    );
  },

  async updateMaintenanceStatus(req, res) {
    const record = await maintenanceService.updateMaintenanceStatus(
      req.params.maintenanceId,
      req.user,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Maintenance request status updated successfully",
        data: { maintenance: record },
      })
    );
  },
};
