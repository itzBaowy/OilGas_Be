import { responseSuccess } from "../common/helpers/function.helper.js";
import { instrumentService } from "../services/instrument.service.js";

export const instrumentController = {
  /**
   * Get all instruments with filters and pagination
   */
  async getAllInstruments(req, res, next) {
    const result = await instrumentService.getAllInstruments(req);
    const response = responseSuccess(result, "Get all instruments successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Get instrument by ID
   */
  async getInstrumentById(req, res, next) {
    const result = await instrumentService.getInstrumentById(req.params.id);
    const response = responseSuccess(result, "Get instrument successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Get all instrument types
   */
  async getTypes(req, res, next) {
    const result = instrumentService.getTypes();
    const response = responseSuccess(result, "Instrument types retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Get all instrument statuses
   */
  async getStatuses(req, res, next) {
    const result = instrumentService.getStatuses();
    const response = responseSuccess(result, "Instrument statuses retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Get all locations
   */
  async getLocations(req, res, next) {
    const result = await instrumentService.getLocations();
    const response = responseSuccess(result, "Locations retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Create new instrument
   */
  async createInstrument(req, res, next) {
    const result = await instrumentService.createInstrument(req);
    const response = responseSuccess(result, "Instrument created successfully", 201);
    res.status(response.statusCode).json(response);
  },

  /**
   * Update instrument
   */
  async updateInstrument(req, res, next) {
    const result = await instrumentService.updateInstrument(req);
    const response = responseSuccess(result, "Instrument updated successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Decommission instrument
   */
  async decommissionInstrument(req, res, next) {
    const result = await instrumentService.decommissionInstrument(req);
    const response = responseSuccess(result, "Instrument decommissioned successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Assign engineer to instrument
   */
  async assignEngineer(req, res, next) {
    const result = await instrumentService.assignEngineer(req);
    const response = responseSuccess(result, "Engineer assigned successfully", 201);
    res.status(response.statusCode).json(response);
  },

  /**
   * Remove engineer assignment
   */
  async removeEngineerAssignment(req, res, next) {
    const result = await instrumentService.removeEngineerAssignment(req);
    const response = responseSuccess(result, "Engineer assignment removed successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Get all instrument maintenance history with filters and pagination
   */
  async getAllInstrumentMaintenanceHistory(req, res, next) {
    const result = await instrumentService.getAllInstrumentMaintenanceHistory(req);
    const response = responseSuccess(result, "All instrument maintenance history retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Get maintenance history for a specific instrument
   */
  async getInstrumentMaintenanceHistory(req, res, next) {
    const result = await instrumentService.getInstrumentMaintenanceHistory(req.params.instrumentId, req.query);
    const response = responseSuccess(result, "Instrument maintenance history retrieved successfully");
    res.status(response.statusCode).json(response);
  },

  /**
   * Get instrument maintenance types
   */
  async getInstrumentMaintenanceTypes(req, res, next) {
    const result = await instrumentService.getInstrumentMaintenanceTypes();
    const response = responseSuccess(result, "Instrument maintenance types retrieved successfully");
    res.status(response.statusCode).json(response);
  },
};
