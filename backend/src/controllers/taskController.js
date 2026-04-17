import { StatusCodes } from "http-status-codes";
import { taskService } from "../services/taskService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const taskController = {
  async createTask(req, res) {
    const task = await taskService.createTask(req.user, req.body);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Task created successfully",
        data: { task },
      })
    );
  },

  async listAssignedTasks(req, res) {
    const result = await taskService.listAssignedTasks(req.user, req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Assigned tasks fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getAssignedTaskById(req, res) {
    const task = await taskService.getAssignedTaskById(req.user, req.params.taskId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Assigned task fetched successfully",
        data: { task },
      })
    );
  },

  async updateAssignedTask(req, res) {
    const task = await taskService.updateAssignedTask(req.user, req.params.taskId, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Task updated successfully",
        data: { task },
      })
    );
  },

  async listTasks(req, res) {
    const result = await taskService.listTasks(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Tasks fetched successfully",
        data: {
          items: result.items,
          summary: result.summary,
        },
        meta: result.meta,
      })
    );
  },

  async getTaskById(req, res) {
    const task = await taskService.getTaskById(req.params.taskId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Task fetched successfully",
        data: { task },
      })
    );
  },

  async updateTask(req, res) {
    const task = await taskService.updateTask(req.params.taskId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Task updated successfully",
        data: { task },
      })
    );
  },

  async updateTaskStatus(req, res) {
    const task = await taskService.updateTaskStatus(req.params.taskId, req.user, req.body);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Task status updated successfully",
        data: { task },
      })
    );
  },
};

