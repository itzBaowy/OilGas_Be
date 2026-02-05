import express from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { protect } from "../common/middlewares/protect.middleware.js";

const notificationRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API quản lý thông báo
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo của user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng item trên mỗi trang
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string để lọc (ví dụ {"isRead":false})
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Chưa đăng nhập
 *   post:
 *     summary: Tạo thông báo mới (for testing)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - title
 *               - message
 *             properties:
 *               recipientId:
 *                 type: string
 *                 description: ID của người nhận
 *               title:
 *                 type: string
 *                 description: Tiêu đề thông báo
 *               message:
 *                 type: string
 *                 description: Nội dung thông báo
 *               type:
 *                 type: string
 *                 enum: [INFO, SUCCESS, WARNING, ERROR, SYSTEM]
 *                 default: INFO
 *               category:
 *                 type: string
 *                 enum: [USER, ROLE, EQUIPMENT, WAREHOUSE, INVENTORY, MAINTENANCE, SYSTEM]
 *               relatedId:
 *                 type: string
 *                 description: ID của entity liên quan
 *               link:
 *                 type: string
 *                 description: Deep link đến trang chi tiết
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */
notificationRouter.get("/", protect, notificationController.getNotifications);
notificationRouter.post("/", protect, notificationController.createNotification);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Đếm số thông báo chưa đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đếm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                 content:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                       example: 5
 */
notificationRouter.get("/unread-count", protect, notificationController.getUnreadCount);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   put:
 *     summary: Đánh dấu thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của notification
 *     responses:
 *       200:
 *         description: Đánh dấu thành công
 *       404:
 *         description: Notification không tồn tại
 */
notificationRouter.put("/:notificationId/read", protect, notificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Đánh dấu tất cả thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đánh dấu thành công
 */
notificationRouter.put("/read-all", protect, notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Xóa thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của notification
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Notification không tồn tại
 */
notificationRouter.delete("/:notificationId", protect, notificationController.deleteNotification);

export default notificationRouter;
