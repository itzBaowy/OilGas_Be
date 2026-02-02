import { responseSuccess } from "../common/helpers/function.helper.js";
import { equipmentService } from "../services/equipment.service.js";

export const equipmentController = {
    /**
     * POST /api/equipments
     */
    async createEquipment(req, res, next) {
        const result = await equipmentService.createEquipment(req);
        const response = responseSuccess(result, "Equipment created successfully", 201);
        res.status(response.statusCode).json(response);
    },

    /**
     * GET /api/equipments
     */
    async getAllEquipment(req, res, next) {
        const result = await equipmentService.getAllEquipment(req);
        const response = responseSuccess(result, "Get all equipment successfully");
        res.status(response.statusCode).json(response);
    },

    /**
     * GET /api/equipments/:id
     */
    async getEquipmentById(req, res, next) {
        const result = await equipmentService.getEquipmentById(req.params.id);
        const response = responseSuccess(result, "Get equipment successfully");
        res.status(response.statusCode).json(response);
    },

    /**
     * PUT /api/equipments/:id
     */
    async updateEquipment(req, res, next) {
        const result = await equipmentService.updateEquipment(req);
        const response = responseSuccess(result, "Equipment updated successfully");
        res.status(response.statusCode).json(response);
    },

    /**
     * DELETE /api/equipments/:id
     */
    async deleteEquipment(req, res, next) {
        const result = await equipmentService.deleteEquipment(req.params.id);
        const response = responseSuccess(result, "Equipment deleted successfully");
        res.status(response.statusCode).json(response);
    }
};
