import { StatusCodes } from "http-status-codes";
import { roomAllocationService } from "../services/roomAllocationService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const roomAllocationController = {
  async createMyRequest(req, res) {
    const allocation = await roomAllocationService.createMyRequest(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Room allocation request submitted successfully",
        data: { allocation },
      })
    );
  },

  async listMyAllocations(req, res) {
    const result = await roomAllocationService.listMyAllocations(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room allocations fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getMyLatestAllocation(req, res) {
    const allocation = await roomAllocationService.getMyLatestAllocation(req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Latest room allocation fetched successfully",
        data: { allocation },
      })
    );
  },

  async getMyAllocationById(req, res) {
    const allocation = await roomAllocationService.getMyAllocationById(req.user, req.params.allocationId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room allocation fetched successfully",
        data: { allocation },
      })
    );
  },

  async listAllocations(req, res) {
    const result = await roomAllocationService.listAllocations(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room allocations fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getAllocationById(req, res) {
    const allocation = await roomAllocationService.getAllocationById(req.params.allocationId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room allocation fetched successfully",
        data: { allocation },
      })
    );
  },

  async approveAllocation(req, res) {
    const allocation = await roomAllocationService.approveAllocation(
      req.params.allocationId,
      req.user,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room allocation approved successfully",
        data: { allocation },
      })
    );
  },

  async rejectAllocation(req, res) {
    const allocation = await roomAllocationService.rejectAllocation(
      req.params.allocationId,
      req.user,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room allocation rejected successfully",
        data: { allocation },
      })
    );
  },

  async activateAllocation(req, res) {
    const allocation = await roomAllocationService.activateAllocation(
      req.params.allocationId,
      req.user,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room allocation activated successfully",
        data: { allocation },
      })
    );
  },

  async completeAllocation(req, res) {
    const allocation = await roomAllocationService.completeAllocation(
      req.params.allocationId,
      req.user,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room allocation completed successfully",
        data: { allocation },
      })
    );
  },

  async transferAllocation(req, res) {
    const result = await roomAllocationService.transferAllocation(
      req.params.allocationId,
      req.user,
      req.body
    );
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room allocation transferred successfully",
        data: {
          allocation: result.allocation,
          previousAllocation: result.previousAllocation,
        },
      })
    );
  },
};
