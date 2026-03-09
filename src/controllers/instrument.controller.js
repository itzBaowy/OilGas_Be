import { responseSuccess } from "../common/helpers/function.helper.js";
import { instrumentService } from "../services/instrument.service.js";

export const instrumentController = {

  async getAllInstruments(req, res, next) {
    const result = await instrumentService.getAllInstruments(req);
    const response = responseSuccess(result, "Get all instruments successfully");
    res.status(response.statusCode).json(response);
  },

  async getInstrumentById(req, res, next) {
    const result = await instrumentService.getInstrumentById(req.params.id);
    const response = responseSuccess(result, "Get instrument successfully");
    res.status(response.statusCode).json(response);
  },

  async getTypes(req, res, next) {
    const result = instrumentService.getTypes();
    const response = responseSuccess(result, "Instrument types retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  async getStatuses(req, res, next) {
    const result = instrumentService.getStatuses();
    const response = responseSuccess(result, "Instrument statuses retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  async getLocations(req, res, next) {
    const result = await instrumentService.getLocations();
    const response = responseSuccess(result, "Locations retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  async createInstrument(req, res, next) {
    const result = await instrumentService.createInstrument(req);
    const response = responseSuccess(result, "Instrument created successfully", 201);
    res.status(response.statusCode).json(response);
  },

  async updateInstrument(req, res, next) {
    const result = await instrumentService.updateInstrument(req);
    const response = responseSuccess(result, "Instrument updated successfully");
    res.status(response.statusCode).json(response);
  },

  async decommissionInstrument(req, res, next) {
    const result = await instrumentService.decommissionInstrument(req);
    const response = responseSuccess(result, "Instrument decommissioned successfully");
    res.status(response.statusCode).json(response);
  },

  async assignEngineer(req, res, next) {
    const result = await instrumentService.assignEngineer(req);
    const response = responseSuccess(result, "Engineer assigned successfully", 201);
    res.status(response.statusCode).json(response);
  },

  async removeEngineerAssignment(req, res, next) {
    const result = await instrumentService.removeEngineerAssignment(req);
    const response = responseSuccess(result, "Engineer assignment removed successfully");
    res.status(response.statusCode).json(response);
  },

  async getAllInstrumentMaintenanceHistory(req, res, next) {
    const result = await instrumentService.getAllInstrumentMaintenanceHistory(req);
    const response = responseSuccess(result, "All instrument maintenance history retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  async getInstrumentMaintenanceHistory(req, res, next) {
    const result = await instrumentService.getInstrumentMaintenanceHistory(req.params.instrumentId, req.query);
    const response = responseSuccess(result, "Instrument maintenance history retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  async getInstrumentMaintenanceTypes(req, res, next) {
    const result = await instrumentService.getInstrumentMaintenanceTypes();
    const response = responseSuccess(result, "Instrument maintenance types retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  async getInstrumentMaintenanceStatuses(req, res, next) {
    const result = await instrumentService.getInstrumentMaintenanceStatuses();
    const response = responseSuccess(result, "Instrument maintenance statuses retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  async getMaintenanceGrouped(req, res, next) {
    const result = await instrumentService.getMaintenanceGrouped(req.query);
    const response = responseSuccess(result, "Maintenance records grouped by instrument retrieved successfully");
    res.status(response.statusCode).json(response);
  },
};
