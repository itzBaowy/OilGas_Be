import { responseSuccess } from "../common/helpers/function.helper.js";
import { dashboardService } from "../services/dashboard.service.js";

export const dashboardController = {
  async getSupervisorDashboard(req, res, next) {
    try {
      const result = await dashboardService.getSupervisorDashboard();
      const response = responseSuccess(result, "Dashboard data retrieved successfully");
      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  },
};
