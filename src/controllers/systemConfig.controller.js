import { responseSuccess } from '../common/helpers/function.helper.js';
import { systemConfigService } from '../services/systemConfig.service.js';

export const systemConfigController = {
  async getIncidentThresholds(req, res) {
    const data = await systemConfigService.getIncidentThresholds();
    const response = responseSuccess(data, 'Configuration retrieved successfully');
    res.status(response.statusCode).json(response);
  },

  async updateIncidentThresholds(req, res) {
    const data = await systemConfigService.updateIncidentThresholds(req.body, req.user.id);
    const response = responseSuccess(data, 'Configuration updated successfully');
    res.status(response.statusCode).json(response);
  },

  async resetIncidentThresholds(req, res) {
    const data = await systemConfigService.resetIncidentThresholds(req.user.id);
    const response = responseSuccess(data, 'Configuration reset to defaults successfully');
    res.status(response.statusCode).json(response);
  },

  async scanCurrentViolations(req, res) {
    const data = await systemConfigService.scanCurrentViolations();
    const response = responseSuccess(data, 'Violation scan completed successfully');
    res.status(response.statusCode).json(response);
  },
};
