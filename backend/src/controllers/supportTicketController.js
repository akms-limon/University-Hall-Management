import { StatusCodes } from "http-status-codes";
import { supportTicketService } from "../services/supportTicketService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const supportTicketController = {
  async createMyTicket(req, res) {
    const ticket = await supportTicketService.createMyTicket(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Support ticket submitted successfully",
        data: { ticket },
      })
    );
  },

  async listMyTickets(req, res) {
    const result = await supportTicketService.listMyTickets(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support tickets fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getMyTicketById(req, res) {
    const ticket = await supportTicketService.getMyTicketById(req.user, req.params.ticketId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support ticket fetched successfully",
        data: { ticket },
      })
    );
  },

  async addMyMessage(req, res) {
    const ticket = await supportTicketService.addMyMessage(req.user, req.params.ticketId, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support ticket message added successfully",
        data: { ticket },
      })
    );
  },

  async listAssignedTickets(req, res) {
    const result = await supportTicketService.listAssignedTickets(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Assigned support tickets fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getAssignedTicketById(req, res) {
    const ticket = await supportTicketService.getAssignedTicketById(req.user, req.params.ticketId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Assigned support ticket fetched successfully",
        data: { ticket },
      })
    );
  },

  async addAssignedMessage(req, res) {
    const ticket = await supportTicketService.addAssignedMessage(req.user, req.params.ticketId, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support ticket reply added successfully",
        data: { ticket },
      })
    );
  },

  async updateAssignedTicket(req, res) {
    const ticket = await supportTicketService.updateAssignedTicket(req.user, req.params.ticketId, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support ticket updated successfully",
        data: { ticket },
      })
    );
  },

  async listTickets(req, res) {
    const result = await supportTicketService.listTickets(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support tickets fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getTicketById(req, res) {
    const ticket = await supportTicketService.getTicketById(req.params.ticketId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support ticket fetched successfully",
        data: { ticket },
      })
    );
  },

  async assignTicket(req, res) {
    const ticket = await supportTicketService.assignTicket(req.params.ticketId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support ticket assigned successfully",
        data: { ticket },
      })
    );
  },

  async updateTicketStatus(req, res) {
    const ticket = await supportTicketService.updateTicketStatus(req.params.ticketId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support ticket status updated successfully",
        data: { ticket },
      })
    );
  },

  async addProvostMessage(req, res) {
    const ticket = await supportTicketService.addProvostMessage(req.params.ticketId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Support ticket reply added successfully",
        data: { ticket },
      })
    );
  },
};

