import { responseSuccess } from "../common/helpers/function.helper.js";
import { warehouseService } from "../services/warehouse.service.js";

export const warehouseController = {
    async getAllWarehouses(req, res, next) {
        const result = await warehouseService.getAllWarehouses(req);
        const response = responseSuccess(result, "Get all warehouses successfully");
        res.status(response.statusCode).json(response);
    },

    async getWarehouseById(req, res, next) {
        const { warehouseId } = req.params;
        const result = await warehouseService.getWarehouseById(warehouseId);
        const response = responseSuccess(result, "Get warehouse detail successfully");
        res.status(response.statusCode).json(response);
    },

    async createWarehouse(req, res, next) {
        const userId = req.user?.id; // Lấy userId từ middleware protect
        const result = await warehouseService.createWarehouse(req.body, userId);
        const response = responseSuccess(result, "Create warehouse successfully");
        res.status(response.statusCode).json(response);
    },

    async updateWarehouse(req, res, next) {
        const { warehouseId } = req.params;
        const userId = req.user?.id;
        const result = await warehouseService.updateWarehouse(warehouseId, req.body, userId);
        const response = responseSuccess(result, "Update warehouse successfully");
        res.status(response.statusCode).json(response);
    },

    async deleteWarehouse(req, res, next) {
        const { warehouseId } = req.params;
        const result = await warehouseService.deleteWarehouse(warehouseId);
        const response = responseSuccess(result, "Delete warehouse successfully");
        res.status(response.statusCode).json(response);
    },

    async updateWarehouseStatus(req, res, next) {
        const { warehouseId } = req.params;
        const { status } = req.body;
        const result = await warehouseService.updateWarehouseStatus(warehouseId, status);
        const response = responseSuccess(result, "Update warehouse status successfully");
        res.status(response.statusCode).json(response);
    }
};
