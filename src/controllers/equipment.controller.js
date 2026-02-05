import { responseSuccess } from "../common/helpers/function.helper.js";
import { equipmentService } from "../services/equipment.service.js";

export const equipmentController = {
    async createEquipment(req, res, next) {
        const result = await equipmentService.createEquipment(req);
        const response = responseSuccess(result, "Equipment created successfully", 201);
        res.status(response.statusCode).json(response);
    },
    async getAllEquipment(req, res, next) {
        const result = await equipmentService.getAllEquipment(req);
        const response = responseSuccess(result, "Get all equipment successfully");
        res.status(response.statusCode).json(response);
    },
    async getEquipmentById(req, res, next) {
        const result = await equipmentService.getEquipmentById(req.params.id);
        const response = responseSuccess(result, "Get equipment successfully");
        res.status(response.statusCode).json(response);
    },
    async updateEquipment(req, res, next) {
        const result = await equipmentService.updateEquipment(req);
        const response = responseSuccess(result, "Equipment updated successfully");
        res.status(response.statusCode).json(response);
    },
    async deleteEquipment(req, res, next) {
        const result = await equipmentService.deleteEquipment(req.params.id);
        const response = responseSuccess(result, "Equipment deleted successfully");
        res.status(response.statusCode).json(response);
    },
    async getAllMaintenanceHistory(req, res, next) {
        const result = await equipmentService.getAllMaintenanceHistory(req);
        const response = responseSuccess(result, "All maintenance history retrieved successfully");
        res.status(response.statusCode).json(response);
    },
    async getMaintenanceHistory(req, res, next) {
        const result = await equipmentService.getMaintenanceHistory(req.params.equipmentId, req.query);
        const response = responseSuccess(result, "Maintenance history retrieved successfully");
        res.status(response.statusCode).json(response);
    },
    async getStatuses(req, res, next) {
        const result = equipmentService.getStatuses();
        const response = responseSuccess(result, "Equipment statuses retrieved successfully");
        res.status(response.statusCode).json(response);
    },
    async getTypes(req, res, next) {
        const result = await equipmentService.getTypes();
        const response = responseSuccess(result, "Equipment types retrieved successfully");
        res.status(response.statusCode).json(response);
    },
    async getMaintenanceTypes(req, res, next) {
        const result = await equipmentService.getMaintenanceTypes();
        const response = responseSuccess(result, "Maintenance types retrieved successfully");
        res.status(response.statusCode).json(response);
    }
};
