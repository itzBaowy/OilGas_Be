import { responseSuccess } from "../common/helpers/function.helper.js";
import { roleService } from "../services/role.service.js";

export const roleController = {
    async getAllRoles(req, res, next) {
        const result = await roleService.getAllRoles(req);
        const response = responseSuccess(result, "Get all roles successfully");
        res.status(response.statusCode).json(response);
    },

    async getRoleById(req, res, next) {
        const { roleId } = req.params;
        const result = await roleService.getRoleById(roleId);
        const response = responseSuccess(result, "Get role detail successfully");
        res.status(response.statusCode).json(response);
    },

    async createRole(req, res, next) {
        const result = await roleService.createRole(req.body);
        const response = responseSuccess(result, "Create role successfully");
        res.status(response.statusCode).json(response);
    },

    async updateRole(req, res, next) {
        const { roleId } = req.params;
        const result = await roleService.updateRole(roleId, req.body);
        const response = responseSuccess(result, "Update role successfully");
        res.status(response.statusCode).json(response);
    },

    async deleteRole(req, res, next) {
        const { roleId } = req.params;
        const result = await roleService.deleteRole(roleId);
        const response = responseSuccess(result, "Delete role successfully");
        res.status(response.statusCode).json(response);
    },

    async addPermission(req, res, next) {
        const { roleId } = req.params;
        const { permission } = req.body;
        const result = await roleService.addPermission(roleId, permission);
        const response = responseSuccess(result, "Add permission successfully");
        res.status(response.statusCode).json(response);
    },

    async removePermission(req, res, next) {
        const { roleId } = req.params;
        const { permission } = req.body;
        const result = await roleService.removePermission(roleId, permission);
        const response = responseSuccess(result, "Remove permission successfully");
        res.status(response.statusCode).json(response);
    },

    async updatePermissions(req, res, next) {
        const { roleId } = req.params;
        const { permissions } = req.body;
        const result = await roleService.updatePermissions(roleId, permissions);
        const response = responseSuccess(result, "Update permissions successfully");
        res.status(response.statusCode).json(response);
    }
};
