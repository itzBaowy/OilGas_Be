import { responseSuccess } from "../common/helpers/function.helper.js";
import { notificationService } from "../services/notification.service.js";

export const notificationController = {
    /**
     * POST /api/notifications - Tạo notification mới
     */
    async createNotification(req, res, next) {
        const result = await notificationService.createNotification(req);
        const response = responseSuccess(result, "Create notification successfully");
        res.status(201).json(response);
    },

    /**
     * GET /api/notifications - Lấy danh sách notifications
     */
    async getNotifications(req, res, next) {
        const result = await notificationService.getNotifications(req);
        const response = responseSuccess(result, "Get notifications successfully");
        res.status(response.statusCode).json(response);
    },

    /**
     * GET /api/notifications/unread-count - Đếm số notifications chưa đọc
     */
    async getUnreadCount(req, res, next) {
        const result = await notificationService.getUnreadCount(req);
        const response = responseSuccess(result, "Get unread count successfully");
        res.status(response.statusCode).json(response);
    },

    /**
     * PUT /api/notifications/:notificationId/read - Đánh dấu đã đọc
     */
    async markAsRead(req, res, next) {
        const result = await notificationService.markAsRead(req);
        const response = responseSuccess(result, "Marked as read successfully");
        res.status(response.statusCode).json(response);
    },

    /**
     * PUT /api/notifications/read-all - Đánh dấu tất cả đã đọc
     */
    async markAllAsRead(req, res, next) {
        const result = await notificationService.markAllAsRead(req);
        const response = responseSuccess(result, "Marked all as read successfully");
        res.status(response.statusCode).json(response);
    },

    /**
     * DELETE /api/notifications/:notificationId - Xóa notification
     */
    async deleteNotification(req, res, next) {
        const result = await notificationService.deleteNotification(req);
        const response = responseSuccess(result, "Delete notification successfully");
        res.status(response.statusCode).json(response);
    },
};
