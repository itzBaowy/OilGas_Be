import { responseSuccess } from "../common/helpers/function.helper.js";
import { userService } from "../services/user.service.js";

export const userController = {
   async getAllUsers(req, res, next) {
      const result = await userService.getAllUsers(req);
      const response = responseSuccess(result, `Get all users successfully`);
      res.status(response.statusCode).json(response);
   },
   async avatarCloud(req, res, next) {
      const result = await userService.avatarCloud(req);
      const response = responseSuccess(result, `avatarCloud user successfully`);
      res.status(response.statusCode).json(response);
   },
};