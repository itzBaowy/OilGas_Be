import { responseSuccess } from "../common/helpers/function.helper.js";
import { oilTransactionService } from "../services/oilTransaction.service.js";

export const oilTransactionController = {
  async extractOil(req, res, next) {
    const userId = req.user?.id;
    const result = await oilTransactionService.extractOil(req.body, userId);
    const response = responseSuccess(result, "Oil extracted successfully", 201);
    res.status(response.statusCode).json(response);
  },

  async dispatchOil(req, res, next) {
    const userId = req.user?.id;
    const result = await oilTransactionService.dispatchOil(req.body, userId);
    const response = responseSuccess(result, "Oil dispatched successfully", 201);
    res.status(response.statusCode).json(response);
  },

  async transferOil(req, res, next) {
    const userId = req.user?.id;
    const result = await oilTransactionService.transferOil(req.body, userId);
    const response = responseSuccess(result, "Oil transferred successfully", 201);
    res.status(response.statusCode).json(response);
  },

  async getAllTransactions(req, res, next) {
    const result = await oilTransactionService.getAllTransactions(req);
    const response = responseSuccess(result, "Get all oil transactions successfully");
    res.status(response.statusCode).json(response);
  },

  async getTransactionById(req, res, next) {
    const result = await oilTransactionService.getTransactionById(req.params.id);
    const response = responseSuccess(result, "Get oil transaction detail successfully");
    res.status(response.statusCode).json(response);
  },

  async getOilSummary(req, res, next) {
    const result = await oilTransactionService.getOilSummary();
    const response = responseSuccess(result, "Get oil summary successfully");
    res.status(response.statusCode).json(response);
  },

  async getUnassignedOilPumps(req, res, next) {
    const result = await oilTransactionService.getUnassignedOilPumps();
    const response = responseSuccess(result, "Get unassigned oil pumps successfully");
    res.status(response.statusCode).json(response);
  },

  async assignOilPump(req, res, next) {
    const result = await oilTransactionService.assignOilPump(req.body);
    const response = responseSuccess(result, "Oil pump assigned successfully", 201);
    res.status(response.statusCode).json(response);
  },

  async unassignOilPump(req, res, next) {
    const result = await oilTransactionService.unassignOilPump(req.params.id);
    const response = responseSuccess(result, "Oil pump unassigned successfully");
    res.status(response.statusCode).json(response);
  },

  async startAutoExtract(req, res, next) {
    const result = await oilTransactionService.startAutoExtract(req.body);
    const response = responseSuccess(result, "Auto-extraction started", 201);
    res.status(response.statusCode).json(response);
  },

  async stopAutoExtract(req, res, next) {
    const result = await oilTransactionService.stopAutoExtract(req.body);
    const response = responseSuccess(result, "Auto-extraction stopped");
    res.status(response.statusCode).json(response);
  },

  async getAutoExtractStatus(req, res, next) {
    const result = await oilTransactionService.getAutoExtractStatus(req.params.instrumentId);
    const response = responseSuccess(result, "Auto-extract status retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  async simulatePump(req, res, next) {
    const result = await oilTransactionService.simulatePump(req.body, req.user);
    const response = responseSuccess(result, "Pump simulation completed successfully", 201);
    res.status(response.statusCode).json(response);
  },
};
