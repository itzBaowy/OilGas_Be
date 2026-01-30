import { get } from "http";
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
     },
     async changePassword(req, res, next) {
          const result = await authService.changePassword(req);
          const response = responseSuccess(result, `Change password successfully`);
          res.status(response.statusCode).json(response);
     },
     async forgotPassword(req, res, next) {
          const result = await authService.forgotPassword(req);
          const response = responseSuccess(result, `Reset password email sent successfully`);
          res.status(response.statusCode).json(response);
     },
     async resetPassword(req, res, next) {
          const result = await authService.resetPassword(req);
          const response = responseSuccess(result, `Password reset successfully`);
          res.status(response.statusCode).json(response);

     },
     async googleCallback(req, res, next) {
          const result = await authService.googleCallback(req);
          res.redirect(result);
     },
     async getLoginHistory(req, res, next) {
          const result = await authService.getLoginHistory(req);
          const response = responseSuccess(result, `Login history retrieved successfully`);
          res.status(response.statusCode).json(response);
     }
};