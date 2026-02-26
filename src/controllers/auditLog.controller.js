import { responseSuccess } from '../common/helpers/function.helper.js';
import { auditLogService } from '../services/auditLog.service.js';

export const auditLogController = {
  async getAuditLogs(req, res, next) {
    const result = await auditLogService.getAuditLogs(req);
    const response = responseSuccess(result, `Get audit logs successfully`);
    res.status(response.statusCode).json(response);
  },
  async getAuditLogById(req, res, next) {
    const result = await auditLogService.getAuditLogById(req);
    const response = responseSuccess(result, `Get audit log detail successfully`);
    res.status(response.statusCode).json(response);
  },
  async deleteAuditLog(req, res, next) {
    const result = await auditLogService.deleteAuditLog(req);
    const response = responseSuccess(result, `Delete audit log successfully`);
    res.status(response.statusCode).json(response);
  },
  async getAuditLogsByEntity(req, res, next) {
    const { entityType, entityId } = req.params;
    const result = await auditLogService.getAuditLogsByEntity(entityType, entityId);
    const response = responseSuccess(result, `Get audit logs by entity successfully`);
    res.status(response.statusCode).json(response);
  },
  async getAuditLogsByUser(req, res, next) {
    const { userId } = req.params;
    const result = await auditLogService.getAuditLogsByUser(userId);
    const response = responseSuccess(result, `Get audit logs by user successfully`);
    res.status(response.statusCode).json(response);
  },
};
