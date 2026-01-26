import express from 'express';
import { logController } from '../controllers/log.controller.js';
import { protect } from '../common/middlewares/protect.middleware.js';

const logRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: API quản lý logs hệ thống
 */

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Lấy danh sách logs (có phân trang và lọc)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Số trang hiện tại
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 3
 *           minimum: 1
 *         description: Số lượng item trên mỗi trang
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string để lọc dữ liệu (ví dụ {"method":"GET","statusCode":200})
 *         example: '{"method":"POST","statusCode":200}'
 *     responses:
 *       200:
 *         description: Lấy danh sách logs thành công
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
 *                   example: Get logs successfully
 *                 content:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalItem:
 *                       type: integer
 *                     totalPage:
 *                       type: integer
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           method:
 *                             type: string
 *                           path:
 *                             type: string
 *                           statusCode:
 *                             type: integer
 *                           userId:
 *                             type: string
 *                           userEmail:
 *                             type: string
 *                           ipAddress:
 *                             type: string
 *                           userAgent:
 *                             type: string
 *                           responseTime:
 *                             type: integer
 *                           errorMessage:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Không có quyền truy cập
 */
logRouter.get('/', protect, logController.getLogs);

/**
 * @swagger
 * /api/logs/{id}:
 *   get:
 *     summary: Lấy chi tiết log theo ID
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của log
 *     responses:
 *       200:
 *         description: Lấy chi tiết log thành công
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
 *                   example: Get log detail successfully
 *                 content:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     method:
 *                       type: string
 *                     path:
 *                       type: string
 *                     statusCode:
 *                       type: integer
 *                     userId:
 *                       type: string
 *                     userEmail:
 *                       type: string
 *                     ipAddress:
 *                       type: string
 *                     userAgent:
 *                       type: string
 *                     requestBody:
 *                       type: string
 *                     responseTime:
 *                       type: integer
 *                     errorMessage:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy log
 */
logRouter.get('/:id', protect, logController.getLogById);

/**
 * @swagger
 * /api/logs/{id}:
 *   delete:
 *     summary: Xóa log theo ID
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của log cần xóa
 *     responses:
 *       200:
 *         description: Xóa log thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy log
 */
logRouter.delete('/:id', protect, logController.deleteLog);

/**
 * @swagger
 * /api/logs/clear-old:
 *   post:
 *     summary: Xóa logs cũ (theo số ngày)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daysToKeep:
 *                 type: integer
 *                 default: 30
 *                 description: Số ngày logs cần giữ lại (mặc định 30 ngày)
 *     responses:
 *       200:
 *         description: Xóa logs cũ thành công
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
 *                   example: Clear old logs successfully
 *                 content:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: integer
 *                       example: 150
 *       401:
 *         description: Không có quyền truy cập
 */
logRouter.post('/clear-old', protect, logController.clearOldLogs);

export default logRouter;
