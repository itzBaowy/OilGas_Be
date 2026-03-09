import express from 'express';
import { systemConfigController } from '../controllers/systemConfig.controller.js';
import { protect } from '../common/middlewares/protect.middleware.js';
import { checkRole } from '../common/middlewares/authorization.middleware.js';

const systemConfigRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: System Config
 *   description: API cấu hình ngưỡng sự cố
 */

/**
 * @swagger
 * /api/system-config:
 *   get:
 *     summary: Lấy cấu hình ngưỡng
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Lấy cấu hình thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     pressureLimit:
 *                       type: integer
 *                       example: 120
 *                     tempLimit:
 *                       type: integer
 *                       example: 90
 *                     autoRefreshInterval:
 *                       type: integer
 *                       example: 30000
 *                     alertSoundEnabled:
 *                       type: boolean
 *                       example: true
 *                     criticalAlertThreshold:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Chưa đăng nhập
 */
systemConfigRouter.get('/', protect, systemConfigController.getIncidentThresholds);

/**
 * @swagger
 * /api/system-config:
 *   put:
 *     summary: Cập nhật cấu hình ngưỡng (Admin)
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pressureLimit
 *               - tempLimit
 *               - autoRefreshInterval
 *               - alertSoundEnabled
 *               - criticalAlertThreshold
 *             properties:
 *               pressureLimit:
 *                 type: integer
 *                 minimum: 50
 *                 maximum: 500
 *                 example: 150
 *               tempLimit:
 *                 type: integer
 *                 minimum: 30
 *                 maximum: 200
 *                 example: 95
 *               autoRefreshInterval:
 *                 type: integer
 *                 minimum: 5000
 *                 maximum: 300000
 *                 example: 60000
 *               alertSoundEnabled:
 *                 type: boolean
 *                 example: false
 *               criticalAlertThreshold:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 5
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không phải Admin
 */
systemConfigRouter.put('/', protect, checkRole(['Admin']), systemConfigController.updateIncidentThresholds);

/**
 * @swagger
 * /api/system-config/reset:
 *   post:
 *     summary: Reset về mặc định (Admin only)
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reset thành công
 *       403:
 *         description: Không phải Admin
 */
systemConfigRouter.post('/reset', protect, checkRole(['Admin']), systemConfigController.resetIncidentThresholds);

/**
 * @swagger
 * /api/system-config/scan:
 *   get:
 *     summary: Quét vi phạm ngưỡng hiện tại (tất cả Equipment vs Thresholds)
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kết quả quét vi phạm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 thresholds:
 *                   type: object
 *                 violatingIncidents:
 *                   type: array
 *                 equipmentViolations:
 *                   type: array
 *                 totalViolations:
 *                   type: integer
 */
systemConfigRouter.get('/scan', protect, systemConfigController.scanCurrentViolations);

/**
 * @swagger
 * /api/system-config/lockout-policy:
 *   get:
 *     summary: Lấy cấu hình chính sách khóa IP
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy lockout policy thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 maxFailedAttempts:
 *                   type: integer
 *                   example: 5
 *                 lockoutDurationMinutes:
 *                   type: integer
 *                   example: 15
 */
systemConfigRouter.get('/lockout-policy', protect, systemConfigController.getLockoutPolicy);

/**
 * @swagger
 * /api/system-config/lockout-policy:
 *   put:
 *     summary: Cập nhật cấu hình chính sách khóa IP (Admin only)
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maxFailedAttempts
 *               - lockoutDurationMinutes
 *             properties:
 *               maxFailedAttempts:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 5
 *               lockoutDurationMinutes:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 60
 *                 example: 15
 *     responses:
 *       200:
 *         description: Cập nhật lockout policy thành công
 */
systemConfigRouter.put('/lockout-policy', protect, checkRole(['Admin']), systemConfigController.updateLockoutPolicy);

export default systemConfigRouter;
