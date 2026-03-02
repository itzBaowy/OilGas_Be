import express from "express";
import { incidentController } from "../controllers/incident.controller.js";
import { protect } from "../common/middlewares/protect.middleware.js";
import { checkRole } from "../common/middlewares/authorization.middleware.js";

const incidentRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: API quản lý Incident Management (sự cố giàn khoan)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Incident:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "683b5a1e2f4c8d001a2b3c4d"
 *         incidentId:
 *           type: string
 *           example: "INC-001"
 *         instrumentId:
 *           type: string
 *           example: "INS-001"
 *         instrumentName:
 *           type: string
 *           example: "Pressure Sensor Alpha-1"
 *         type:
 *           type: string
 *           enum: [PRESSURE_ANOMALY, TEMPERATURE_ANOMALY, LEAKAGE, EQUIPMENT_FAILURE, SENSOR_MALFUNCTION]
 *         severity:
 *           type: string
 *           enum: [WARNING, CRITICAL, FATAL]
 *         status:
 *           type: string
 *           enum: [OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED]
 *           default: OPEN
 *         description:
 *           type: string
 *         currentReading:
 *           type: number
 *           nullable: true
 *         threshold:
 *           type: number
 *           nullable: true
 *         actionTaken:
 *           type: string
 *           nullable: true
 *         createdByName:
 *           type: string
 *           nullable: true
 *         acknowledgedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         acknowledgedByName:
 *           type: string
 *           nullable: true
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         resolvedByName:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ── ALL ROLES (authenticated) ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/incidents:
 *   get:
 *     summary: Lấy danh sách sự cố (có phân trang và lọc)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: |
 *           Bộ lọc dạng JSON string.
 *           Ví dụ: {"status":"OPEN"} hoặc {"severity":"CRITICAL"} hoặc {"type":"PRESSURE_ANOMALY"}
 *           Hoặc kết hợp: {"status":"OPEN","severity":"FATAL"}
 *           Các field có thể lọc: status, severity, type, instrumentId (exact match)
 *         example: '{"status":"OPEN","severity":"CRITICAL"}'
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *         description: Lọc từ ngày (ISO format)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *         description: Lọc đến ngày (ISO format)
 *     responses:
 *       200:
 *         description: Danh sách sự cố
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: integer, example: 200 }
 *                 message: { type: string, example: Incidents retrieved successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Incident' }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page: { type: integer }
 *                         pageSize: { type: integer }
 *                         totalItems: { type: integer }
 *                         totalPages: { type: integer }
 */
incidentRouter.get("/", protect, incidentController.getAllIncidents);

/**
 * @swagger
 * /api/incidents/active-alerts:
 *   get:
 *     summary: Lấy danh sách alerts đang active (OPEN + ACKNOWLEDGED) - Real-time Dashboard
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: integer, example: 200 }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Incident' }
 *                     count: { type: integer }
 *                     hasHighSeverity: { type: boolean }
 */
// ⚠️ /active-alerts PHẢI đứng trước /:id để Express không hiểu "active-alerts" là :id
incidentRouter.get("/active-alerts", protect, incidentController.getActiveAlerts);

/**
 * @swagger
 * /api/incidents/{id}:
 *   get:
 *     summary: Lấy chi tiết một sự cố
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId của incident
 *     responses:
 *       200:
 *         description: Chi tiết sự cố
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: integer, example: 200 }
 *                 data: { $ref: '#/components/schemas/Incident' }
 *       404:
 *         description: Incident not found
 */
incidentRouter.get("/:id", protect, incidentController.getIncidentById);

// ── ENGINEER + SUPERVISOR: Tạo sự cố ─────────────────────────────────────────

/**
 * @swagger
 * /api/incidents:
 *   post:
 *     summary: Tạo sự cố mới (Frontend trigger khi sensor vượt ngưỡng)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instrumentId, instrumentName, type, severity, description]
 *             properties:
 *               instrumentId:
 *                 type: string
 *                 example: "INS-001"
 *               instrumentName:
 *                 type: string
 *                 example: "Pressure Sensor Alpha-1"
 *               type:
 *                 type: string
 *                 enum: [PRESSURE_ANOMALY, TEMPERATURE_ANOMALY, LEAKAGE, EQUIPMENT_FAILURE, SENSOR_MALFUNCTION]
 *               severity:
 *                 type: string
 *                 enum: [WARNING, CRITICAL, FATAL]
 *               description:
 *                 type: string
 *                 example: "Pressure reading exceeded 120 psi. Current: 145 psi."
 *               currentReading:
 *                 type: number
 *                 example: 145
 *               threshold:
 *                 type: number
 *                 example: 120
 *     responses:
 *       201:
 *         description: Incident tạo thành công
 *       400:
 *         description: Validation error
 */
incidentRouter.post(
    "/",
    protect,
    checkRole(["Engineer", "Supervisor", "Admin"]),
    incidentController.createIncident
);

// ── ENGINEER: Acknowledge ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/incidents/{id}/acknowledge:
 *   post:
 *     summary: Engineer xác nhận đã thấy cảnh báo (OPEN → ACKNOWLEDGED)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Incident acknowledged
 *       400:
 *         description: Only OPEN incidents can be acknowledged
 *       404:
 *         description: Incident not found
 */
incidentRouter.post(
    "/:id/acknowledge",
    protect,
    checkRole(["Engineer"]),
    incidentController.acknowledgeIncident
);

// ── SUPERVISOR: Respond / Resolve ────────────────────────────────────────────

/**
 * @swagger
 * /api/incidents/{id}/respond:
 *   post:
 *     summary: Supervisor phản hồi sự cố (→ IN_PROGRESS hoặc RESOLVED)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [actionTaken, status]
 *             properties:
 *               actionTaken:
 *                 type: string
 *                 minLength: 10
 *                 example: "Replaced faulty pressure valve and recalibrated sensor."
 *               status:
 *                 type: string
 *                 enum: [IN_PROGRESS, RESOLVED]
 *     responses:
 *       200:
 *         description: Response recorded
 *       400:
 *         description: Validation error hoặc incident đã RESOLVED
 *       404:
 *         description: Incident not found
 */
incidentRouter.post(
    "/:id/respond",
    protect,
    checkRole(["Supervisor"]),
    incidentController.respondToIncident
);

export default incidentRouter;
