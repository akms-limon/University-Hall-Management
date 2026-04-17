import { StatusCodes } from "http-status-codes";
import { exampleService } from "../services/exampleService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const exampleController = {
  async protectedPing(req, res) {
    const data = await exampleService.getProtectedSummary(req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Protected example route is working",
        data,
      })
    );
  },

  async provostOnlyPing(req, res) {
    const data = await exampleService.getProvostOnlySummary(req.user);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Provost-only example route is working",
        data,
      })
    );
  },

  async uploadPlaceholder(req, res) {
    const files = Array.isArray(req.files) ? req.files : [];
    const data = await exampleService.getUploadSummary(files);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Upload placeholder route is working",
        data,
      })
    );
  },
};
