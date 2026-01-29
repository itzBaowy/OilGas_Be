import { responseSuccess } from '../common/helpers/function.helper.js';
import { logService } from '../services/log.service.js';

export const logController = {
  async getLogs(req, res, next) {
    const result = await logService.getLogs(req);
    const response = responseSuccess(result, `Get logs successfully`);
    res.status(response.statusCode).json(response);
  },

  async getLogById(req, res, next) {
    const result = await logService.getLogById(req);
    const response = responseSuccess(result, `Get log detail successfully`);
    res.status(response.statusCode).json(response);
  },

  async deleteLog(req, res, next) {
    const result = await logService.deleteLog(req);
    const response = responseSuccess(result, `Delete log successfully`);
    res.status(response.statusCode).json(response);
  },

};
