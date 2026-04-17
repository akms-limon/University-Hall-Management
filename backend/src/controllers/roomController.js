import { StatusCodes } from "http-status-codes";
import { roomService } from "../services/roomService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const roomController = {
  async createRoom(req, res) {
    const room = await roomService.createRoom(req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Room created successfully",
        data: { room },
      })
    );
  },

  async listRooms(req, res) {
    const result = await roomService.listRooms(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Rooms fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getRoomById(req, res) {
    const room = await roomService.getRoomById(req.params.roomId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room fetched successfully",
        data: { room },
      })
    );
  },

  async updateRoomById(req, res) {
    const room = await roomService.updateRoomById(req.params.roomId, req.body, req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room updated successfully",
        data: { room },
      })
    );
  },

  async updateRoomStatus(req, res) {
    const room = await roomService.updateRoomStatus(req.params.roomId, req.body.isActive);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: req.body.isActive ? "Room activated successfully" : "Room deactivated successfully",
        data: { room },
      })
    );
  },

  async listPublicRooms(req, res) {
    const result = await roomService.listPublicRooms(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Available rooms fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getPublicRoomById(req, res) {
    const room = await roomService.getPublicRoomById(req.params.roomId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Room fetched successfully",
        data: { room },
      })
    );
  },
};
