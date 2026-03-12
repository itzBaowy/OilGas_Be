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

  async getLockoutPolicy(req, res) {
    const data = await systemConfigService.getLockoutPolicy();
    const response = responseSuccess(data, 'Lockout policy retrieved successfully');
    res.status(response.statusCode).json(response);
  },

  async updateLockoutPolicy(req, res) {
    const data = await systemConfigService.updateLockoutPolicy(req.body, req.user.id);
    const response = responseSuccess(data, 'Lockout policy updated successfully');
    res.status(response.statusCode).json(response);
  },

  async getPasswordExpiryPolicy(req, res) {
    const data = await systemConfigService.getPasswordExpiryPolicy();
    const response = responseSuccess(data, 'Password expiry policy retrieved successfully');
    res.status(response.statusCode).json(response);
  },

  async updatePasswordExpiryPolicy(req, res) {
    const data = await systemConfigService.updatePasswordExpiryPolicy(req.body, req.user.id);
    const response = responseSuccess(data, 'Password expiry policy updated successfully');
    res.status(response.statusCode).json(response);
  },

  async checkPasswordExpiry(req, res) {
    const data = await systemConfigService.checkAndNotifyPasswordExpiry();
    const response = responseSuccess(data, 'Password expiry check completed successfully');
    res.status(response.statusCode).json(response);
  },

  async getAutoDeactivationPolicy(req, res) {
    const data = await systemConfigService.getAutoDeactivationPolicy();
    const response = responseSuccess(data, 'Auto deactivation policy retrieved successfully');
    res.status(response.statusCode).json(response);
  },

  async updateAutoDeactivationPolicy(req, res) {
    const data = await systemConfigService.updateAutoDeactivationPolicy(req.body, req.user.id);
    const response = responseSuccess(data, 'Auto deactivation policy updated successfully');
    res.status(response.statusCode).json(response);
  },

  async checkAutoDeactivation(req, res) {
    const data = await systemConfigService.checkAndDeactivateInactiveUsers();
    const response = responseSuccess(data, 'Auto deactivation check completed successfully');
    res.status(response.statusCode).json(response);
  },

  async getSessionTimeoutPolicy(req, res) {
    const data = await systemConfigService.getSessionTimeoutPolicy();
    const response = responseSuccess(data, 'Session timeout policy retrieved successfully');
    res.status(response.statusCode).json(response);
  },

  async updateSessionTimeoutPolicy(req, res) {
    const data = await systemConfigService.updateSessionTimeoutPolicy(req.body, req.user.id);
    const response = responseSuccess(data, 'Session timeout policy updated successfully');
    res.status(response.statusCode).json(response);
  },
};
