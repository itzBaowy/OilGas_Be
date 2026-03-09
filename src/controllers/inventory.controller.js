import { responseSuccess } from "../common/helpers/function.helper.js";
import { inventoryService } from "../services/inventory.service.js";

export const inventoryController = {
    async receiveInventory(req, res, next) {
        const userId = req.user?.id;
        const result = await inventoryService.receiveInventory(req.body, userId);
        const response = responseSuccess(result, "Inventory received successfully", 201);
        res.status(response.statusCode).json(response);
    },

    async dispatchInventory(req, res, next) {
        const userId = req.user?.id;
        const result = await inventoryService.dispatchInventory(req.body, userId);
        const response = responseSuccess(result, "Inventory dispatched successfully");
        res.status(response.statusCode).json(response);
    },

    async getAllInventory(req, res, next) {
        const result = await inventoryService.getAllInventory(req);
        const response = responseSuccess(result, "Get all inventory successfully");
        res.status(response.statusCode).json(response);
    },

    async getInventoryById(req, res, next) {
        const result = await inventoryService.getInventoryById(req.params.inventoryId);
        const response = responseSuccess(result, "Get inventory detail successfully");
        res.status(response.statusCode).json(response);
    },

    async getInventoryLedger(req, res, next) {
        const result = await inventoryService.getInventoryLedger(req);
        const response = responseSuccess(result, "Get inventory ledger successfully");
        res.status(response.statusCode).json(response);
    }
};
