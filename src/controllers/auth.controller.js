import { responseSuccess } from "../common/helpers/function.helper.js";
import { authService } from "../services/auth.service.js";

export const authController = {
     async register(req, res, next) {
          const result = await authService.register(req);
          const response = responseSuccess(result, `Register successful`);
          res.status(response.statusCode).json(response);
     },

     async login(req, res, next) {
          const result = await authService.login(req);
          const response = responseSuccess(result, `Login successfully`);
          res.status(response.statusCode).json(response);
     },
     async refreshToken(req, res, next) {
          const result = await authService.refreshToken(req);
          const response = responseSuccess(result, `Refresh token successfully`);
          res.status(response.statusCode).json(response);
     },
     async getInfo(req, res, next) {
          const result = await authService.getInfo(req);
          const response = responseSuccess(result, `Get info successfully`);
          res.status(response.statusCode).json(response);
     }
};