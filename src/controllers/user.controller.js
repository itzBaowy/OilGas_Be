import { responseSuccess } from "../common/helpers/function.helper.js";
import { userService } from "../services/user.service.js";

export const userController = {
   async getAllUsers(req, res, next) {
      const result = await userService.getAllUsers(req);
      const response = responseSuccess(result, `Get all users successfully`);
      res.status(response.statusCode).json(response);
   },
   async createUsers(req, res, next) {
      const result = await userService.createUsers(req);
      const response = responseSuccess(result, `Create user successfully`);
      res.status(response.statusCode).json(response);
   },
   async avatarCloud(req, res, next) {
      const result = await userService.avatarCloud(req);
      const response = responseSuccess(result, `avatarCloud user successfully`);
      res.status(response.statusCode).json(response);
   },
   async updateUser(req, res, next) {
      const result = await userService.updateUser(req);
      const response = responseSuccess(result, `Update user successfully`);
      res.status(response.statusCode).json(response);
   },
   async deleteUser(req, res, next) {
      const result = await userService.deleteUser(req);
      const response = responseSuccess(result, `Delete user successfully`);
      res.status(response.statusCode).json(response);
   },
};