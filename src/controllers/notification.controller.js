import { responseSuccess } from "../common/helpers/function.helper.js";
import { notificationService } from "../services/notification.service.js";

export const notificationController = {
    async createNotification(req, res, next) {
        const result = await notificationService.createNotification(req);
        const response = responseSuccess(result, "Create notification successfully");
        res.status(201).json(response);
    },
    async getNotifications(req, res, next) {
        const result = await notificationService.getNotifications(req);
        const response = responseSuccess(result, "Get notifications successfully");
        res.status(response.statusCode).json(response);
    },
    async getUnreadCount(req, res, next) {
        const result = await notificationService.getUnreadCount(req);
        const response = responseSuccess(result, "Get unread count successfully");
        res.status(response.statusCode).json(response);
    },
    async markAsRead(req, res, next) {
        const result = await notificationService.markAsRead(req);
        const response = responseSuccess(result, "Marked as read successfully");
        res.status(response.statusCode).json(response);
    },
    async markAllAsRead(req, res, next) {
        const result = await notificationService.markAllAsRead(req);
        const response = responseSuccess(result, "Marked all as read successfully");
        res.status(response.statusCode).json(response);
    },
    async deleteNotification(req, res, next) {
        const result = await notificationService.deleteNotification(req);
        const response = responseSuccess(result, "Delete notification successfully");
        res.status(response.statusCode).json(response);
    },
    async sendNotificationByEmail(req, res, next) {
        const result = await notificationService.sendNotificationByEmail(req);
        const response = responseSuccess(result, "Notification sent successfully");
        res.status(201).json(response);
    },
};
