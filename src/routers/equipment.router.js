import express from "express";
import { equipmentController } from "../controllers/equipment.controller.js";
import { protect } from "../common/middlewares/protect.middleware.js";
import { checkPermission } from "../common/middlewares/authorization.middleware.js";

const equipmentRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Equipment
 *   description: API quản lý thiết bị (Equipment Management)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Equipment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: MongoDB ObjectId
 *         equipmentId:
 *           type: string
 *           description: Custom ID format (EQ-001, EQ-002, etc.)
 *           example: EQ-001
 *         name:
 *           type: string
 *           description: Equipment name (unique)
 *           example: Hydraulic Pump HP-100
 *         serialNumber:
 *           type: string
 *           description: Serial number (unique)
 *           example: SN-2024-001
 *         type:
 *           type: string
 *           enum: [Pump, Valve, Compressor, Sensor, Drilling Rig, Pipeline, Scada Unit]
 *           description: Equipment type
 *           example: Pump
 *         status:
 *           type: string
 *           enum: [Active, Inactive, Maintenance]
 *           description: Equipment status
 *           example: Active
 *         location:
 *           type: string
 *           description: Equipment location
 *           example: Site A - Platform 1
 *         manufacturer:
 *           type: string
 *           description: Manufacturer name (optional)
 *           example: Siemens
 *         installDate:
 *           type: string
 *           format: date-time
 *           description: Installation date
 *           example: 2024-01-15T00:00:00.000Z
 *         description:
 *           type: string
 *           description: Equipment description (optional)
 *           example: High-pressure hydraulic pump for drilling operations
 *         isDeleted:
 *           type: boolean
 *           description: Soft delete flag
 *           default: false
 *         specifications:
 *           type: object
 *           description: Flexible technical specifications
 *           example: { "power": "150kW", "pressure": "300 bar", "flowRate": "200 L/min" }
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/equipments:
 *   post:
 *     summary: Tạo thiết bị mới (Create new equipment)
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - serialNumber
 *               - type
 *               - location
 *               - installDate
 *             properties:
 *               name:
 *                 type: string
 *                 example: Hydraulic Pump HP-100
 *               serialNumber:
 *                 type: string
 *                 example: SN-2024-001
 *               type:
 *                 type: string
 *                 enum: [Pump, Valve, Compressor, Sensor, Drilling Rig, Pipeline, Scada Unit]
 *                 example: Pump
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Maintenance]
 *                 example: Active
 *               location:
 *                 type: string
 *                 example: Site A - Platform 1
 *               manufacturer:
 *                 type: string
 *                 example: Siemens
 *               installDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-01-15T00:00:00.000Z
 *               description:
 *                 type: string
 *                 example: High-pressure hydraulic pump for drilling operations
 *               specifications:
 *                 type: object
 *                 example: { "power": "150kW", "pressure": "300 bar", "flowRate": "200 L/min" }
 *     responses:
 *       201:
 *         description: Equipment created successfully
 *       400:
 *         description: Bad request (validation error, duplicate name/serialNumber)
 *       401:
 *         description: Unauthorized
 */
equipmentRouter.post("/", protect,checkPermission(["CREATE_EQUIPMENT", "ALL"]), equipmentController.createEquipment
);

/**
 * @swagger
 * /api/equipments:
 *   get:
 *     summary: Lấy danh sách thiết bị (Get all equipment)
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name or serialNumber
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *     responses:
 *       200:
 *         description: Success
 */
equipmentRouter.get("/", protect, checkPermission(["VIEW_EQUIPMENT", "ALL"]), equipmentController.getAllEquipment
);

/**
 * @swagger
 * /api/equipments/{id}:
 *   get:
 *     summary: Lấy chi tiết thiết bị (Get equipment by ID)
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Equipment ID
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Equipment not found
 */
equipmentRouter.get("/:id", protect, checkPermission(["VIEW_EQUIPMENT", "ALL"]), equipmentController.getEquipmentById);

/**
 * @swagger
 * /api/equipments/{id}:
 *   put:
 *     summary: Cập nhật thiết bị (Update equipment)
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Equipment ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *               location:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               installDate:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 *               specifications:
 *                 type: object
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Validation error
 *       404:
 *         description: Equipment not found
 */
equipmentRouter.put("/:id", protect, checkPermission(["UPDATE_EQUIPMENT", "ALL"]), equipmentController.updateEquipment);

/**
 * @swagger
 * /api/equipments/{id}:
 *   delete:
 *     summary: Xóa thiết bị (Soft delete equipment)
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Equipment ID
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Cannot delete active equipment
 *       404:
 *         description: Equipment not found
 */
equipmentRouter.delete("/:id", protect, checkPermission(["DELETE_EQUIPMENT", "ALL"]), equipmentController.deleteEquipment);

export default equipmentRouter;
