import express from 'express';
import { auditLogController } from '../controllers/auditLog.controller.js';
import { protect } from '../common/middlewares/protect.middleware.js';
import { checkPermission } from '../common/middlewares/authorization.middleware.js';

const auditLogRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: AuditLogs
 *   description: API quản lý audit logs (các hoạt động nghiệp vụ trong hệ thống)
 */

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Lấy danh sách audit logs (có phân trang và lọc)
 *     tags: [AuditLogs]
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
 *           default: 10
 *           minimum: 1
 *         description: Số lượng item trên mỗi trang
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string để lọc dữ liệu
 *         example: '{"action":"CHANGE_PASSWORD","entityType":"USER"}'
 *     responses:
 *       200:
 *         description: Lấy danh sách audit logs thành công
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
 *                   example: Get audit logs successfully
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
 *                           action:
 *                             type: string
 *                             example: CHANGE_PASSWORD
 *                           description:
 *                             type: string
 *                             example: User 15 changed password
 *                           userId:
 *                             type: string
 *                           userEmail:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           roleName:
 *                             type: string
 *                           entityType:
 *                             type: string
 *                           entityId:
 *                             type: string
 *                           entityName:
 *                             type: string
 *                           ipAddress:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Không có quyền truy cập
 */
auditLogRouter.get('/', protect, checkPermission(['VIEW_AUDIT_LOG', 'ALL']), auditLogController.getAuditLogs);

/**
 * @swagger
 * /api/audit-logs/{id}:
 *   get:
 *     summary: Lấy chi tiết audit log theo ID
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của audit log
 *     responses:
 *       200:
 *         description: Lấy chi tiết audit log thành công
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
 *                   example: Get audit log detail successfully
 *                 content:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     action:
 *                       type: string
 *                     description:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     userEmail:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     roleName:
 *                       type: string
 *                     entityType:
 *                       type: string
 *                     entityId:
 *                       type: string
 *                     entityName:
 *                       type: string
 *                     oldValues:
 *                       type: object
 *                     newValues:
 *                       type: object
 *                     ipAddress:
 *                       type: string
 *                     metadata:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy audit log
 */
auditLogRouter.get('/:id', protect, checkPermission(['VIEW_AUDIT_LOG', 'ALL']), auditLogController.getAuditLogById);

/**
 * @swagger
 * /api/audit-logs/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Lấy audit logs theo entity
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *         description: Loại entity (USER, EQUIPMENT, WAREHOUSE, etc.)
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của entity
 *     responses:
 *       200:
 *         description: Lấy audit logs thành công
 *       401:
 *         description: Không có quyền truy cập
 */
auditLogRouter.get('/entity/:entityType/:entityId', protect, checkPermission(['VIEW_AUDIT_LOG', 'ALL']), auditLogController.getAuditLogsByEntity);

/**
 * @swagger
 * /api/audit-logs/user/{userId}:
 *   get:
 *     summary: Lấy audit logs theo user
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của user
 *     responses:
 *       200:
 *         description: Lấy audit logs thành công
 *       401:
 *         description: Không có quyền truy cập
 */
auditLogRouter.get('/user/:userId', protect, checkPermission(['VIEW_AUDIT_LOG', 'ALL']), auditLogController.getAuditLogsByUser);

/**
 * @swagger
 * /api/audit-logs/{id}:
 *   delete:
 *     summary: Xóa audit log theo ID
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của audit log cần xóa
 *     responses:
 *       200:
 *         description: Xóa audit log thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy audit log
 */
auditLogRouter.delete('/:id', protect, checkPermission(['DELETE_AUDIT_LOG', 'ALL']), auditLogController.deleteAuditLog);

export default auditLogRouter;
