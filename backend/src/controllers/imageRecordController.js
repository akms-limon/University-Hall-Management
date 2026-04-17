import { StatusCodes } from "http-status-codes";
import { imageRecordService } from "../services/imageRecordService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const imageRecordController = {
  async createImageRecord(req, res) {
    const item = await imageRecordService.createImageRecord(req.body, req.file, req.user);
    return res.status(StatusCodes.CREATED).json(
      apiResponse({
        message: "Image record created successfully",
        data: { item },
      })
    );
  },

  async listImageRecords(req, res) {
    const result = await imageRecordService.listImageRecords(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Image records fetched successfully",
        data: result,
      })
    );
  },

  async getImageRecordById(req, res) {
    const item = await imageRecordService.getImageRecordById(req.params.imageId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Image record fetched successfully",
        data: { item },
      })
    );
  },

  async updateImageRecordById(req, res) {
    const item = await imageRecordService.updateImageRecordById(req.params.imageId, req.body, req.file);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Image record updated successfully",
        data: { item },
      })
    );
  },

  async deleteImageRecordById(req, res) {
    const item = await imageRecordService.deleteImageRecordById(req.params.imageId);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Image record deleted successfully",
        data: { item },
      })
    );
  },
};

