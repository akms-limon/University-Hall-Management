import { StatusCodes } from "http-status-codes";
import { analyticsService } from "../services/analyticsService.js";
import { apiResponse } from "../utils/ApiResponse.js";

export const analyticsController = {
  async getProvostDashboardSummary(req, res) {
    const result = await analyticsService.getProvostDashboardSummary(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Analytics summary fetched successfully",
        data: {
          range: result.range,
          hallOverview: result.hallOverview,
          hallApplications: result.hallApplications,
          roomAllocations: result.roomAllocations,
          dining: result.dining,
          financial: result.financial,
          complaints: result.complaints,
          maintenance: result.maintenance,
          supportTickets: result.supportTickets,
          tasks: result.tasks,
          notices: result.notices,
        },
      })
    );
  },

  async getStaffDiningSummary(req, res) {
    const result = await analyticsService.getStaffDiningSummary(req.query);
    return res.status(StatusCodes.OK).json(
      apiResponse({
        message: "Dining analytics fetched successfully",
        data: {
          range: result.range,
          today: result.today,
          trend: result.trend,
        },
      })
    );
  },
};
