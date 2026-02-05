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
 *           description: Equipment type (user can input custom type)
 *           example: Pump
 *         model:
 *           type: string
 *           description: Equipment model
 *           example: HP-100
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
 *               - model
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
 *                 description: Custom equipment type
 *                 example: Pump
 *               model:
 *                 type: string
 *                 description: Equipment model
 *                 example: HP-100
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
 * /api/equipments/statuses:
 *   get:
 *     summary: Lấy danh sách Statuses (Dropdown)
 *     description: Get list of available equipment statuses for dropdown selection
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Active", "Inactive", "Maintenance"]
 *                 message:
 *                   type: string
 *                   example: Equipment statuses retrieved successfully
 */
equipmentRouter.get("/statuses", protect, checkPermission(["VIEW_EQUIPMENT", "ALL"]), equipmentController.getStatuses);

/**
 * @swagger
 * /api/equipments/maintenance-history:
 *   get:
 *     summary: Lấy tất cả lịch sử bảo trì (Get all maintenance history)
 *     description: Get maintenance history of all equipment with pagination and filters
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *         example: 2024-01-01
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *         example: 2024-12-31
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by maintenance type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by maintenance status
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *                     totalItem:
 *                       type: integer
 *                       example: 50
 *                     totalPage:
 *                       type: integer
 *                       example: 5
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           equipmentId:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           type:
 *                             type: string
 *                             example: Inspection
 *                           description:
 *                             type: string
 *                           performedBy:
 *                             type: string
 *                           status:
 *                             type: string
 *                             example: Completed
 *                           cost:
 *                             type: number
 *                           equipment:
 *                             type: object
 *                             properties:
 *                               equipmentId:
 *                                 type: string
 *                                 example: EQ-001
 *                               name:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               model:
 *                                 type: string
 *                               serialNumber:
 *                                 type: string
 *                 message:
 *                   type: string
 *                   example: All maintenance history retrieved successfully
 */
equipmentRouter.get("/maintenance-history", protect, checkPermission(["VIEW_EQUIPMENT", "ALL"]), equipmentController.getAllMaintenanceHistory);

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
 *                 description: Custom equipment type
 *               model:
 *                 type: string
 *                 description: Equipment model
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

/**
 * @swagger
 * /api/equipments/{equipmentId}/maintenance-history:
 *   get:
 *     summary: Lấy lịch sử bảo trì thiết bị (Get maintenance history)
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: equipmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Equipment ID (e.g., EQ-001)
 *         example: EQ-001
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *         example: 2024-01-01
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *         example: 2024-12-31
 *     responses:
 *       200:
 *         description: Success (returns empty array if no maintenance records found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Maintenance record ID (MongoDB ObjectId)
 *                         example: 507f1f77bcf86cd799439011
 *                       equipmentId:
 *                         type: string
 *                         description: Equipment ObjectId
 *                         example: 507f191e810c19729de860ea
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         description: Maintenance Date
 *                         example: 2024-12-01T00:00:00.000Z
 *                       type:
 *                         type: string
 *                         enum: [Inspection, Repair, Replacement, Preventive, Corrective, Calibration]
 *                         description: Maintenance Type
 *                         example: Inspection
 *                       description:
 *                         type: string
 *                         description: Description of maintenance work
 *                         example: Routine inspection and oil change
 *                       performedBy:
 *                         type: string
 *                         description: Performed By (technician/engineer name)
 *                         example: John Engineer
 *                       status:
 *                         type: string
 *                         enum: [Completed, Pending, Cancelled]
 *                         description: Maintenance status
 *                         example: Completed
 *                       cost:
 *                         type: number
 *                         description: Maintenance cost (USD)
 *                         example: 1500
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *                   example: Maintenance history retrieved successfully
 *       404:
 *         description: Equipment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: Equipment not found
 *                 errorCode:
 *                   type: string
 *                   example: EQUIPMENT_NOT_FOUND
 */
equipmentRouter.get("/:equipmentId/maintenance-history", protect, checkPermission(["VIEW_EQUIPMENT", "ALL"]), equipmentController.getMaintenanceHistory);
export default equipmentRouter;
