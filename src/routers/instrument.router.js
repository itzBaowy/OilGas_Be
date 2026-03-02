import express from "express";
import { instrumentController } from "../controllers/instrument.controller.js";
import { protect } from "../common/middlewares/protect.middleware.js";
import { checkPermission } from "../common/middlewares/authorization.middleware.js";

const instrumentRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Instruments
 *   description: API quản lý Instrument (Instrument Management)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Instrument:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: MongoDB ObjectId
 *         instrumentId:
 *           type: string
 *           description: Custom ID format (INS-001, INS-002, etc.)
 *           example: INS-001
 *         name:
 *           type: string
 *           description: Instrument name
 *           example: Alpha Platform
 *         type:
 *           type: string
 *           enum: [Offshore Platform, Onshore Rig, FPSO, Jack-up Rig, Semi-submersible]
 *           description: Instrument type
 *           example: Offshore Platform
 *         location:
 *           type: string
 *           description: Instrument location
 *           example: Gulf of Mexico - Block 42
 *         manufacturer:
 *           type: string
 *           description: Manufacturer name (optional)
 *           example: Keppel Offshore
 *         model:
 *           type: string
 *           description: Instrument model (optional)
 *           example: KFELS B Class
 *         status:
 *           type: string
 *           enum: [Active, Inactive, Maintenance, Decommissioned]
 *           description: Instrument status
 *           example: Active
 *         installDate:
 *           type: string
 *           format: date-time
 *           description: Installation date
 *           example: 2020-06-15T00:00:00.000Z
 *         description:
 *           type: string
 *           description: Instrument description (optional)
 *         decommissionReason:
 *           type: string
 *           description: Reason for decommission (if applicable)
 *         decommissionedAt:
 *           type: string
 *           format: date-time
 *           description: Decommission date
 *         isDeleted:
 *           type: boolean
 *           description: Soft delete flag
 *           default: false
 *         lastMaintenanceDate:
 *           type: string
 *           format: date-time
 *           description: Last maintenance date
 *         nextMaintenanceDate:
 *           type: string
 *           format: date-time
 *           description: Next scheduled maintenance date
 *         assignedEngineers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Primary, Support]
 *               assignedAt:
 *                 type: string
 *                 format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     InstrumentType:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: offshore-platform
 *         value:
 *           type: string
 *           example: Offshore Platform
 *         label:
 *           type: string
 *           example: Offshore Platform
 *     InstrumentStatus:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: active
 *         value:
 *           type: string
 *           example: Active
 *         label:
 *           type: string
 *           example: Active
 */

// ==================== STATIC ROUTES (must be before :id routes) ====================

/**
 * @swagger
 * /api/instruments/types:
 *   get:
 *     summary: Lấy danh sách loại instrument (Get instrument types)
 *     tags: [Instruments]
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
 *                 status:
 *                   type: string
 *                   example: success
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InstrumentType'
 */
instrumentRouter.get(
  "/types",
  protect,
  instrumentController.getTypes
);

/**
 * @swagger
 * /api/instruments/statuses:
 *   get:
 *     summary: Lấy danh sách trạng thái instrument (Get instrument statuses)
 *     tags: [Instruments]
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
 *                 status:
 *                   type: string
 *                   example: success
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InstrumentStatus'
 */
instrumentRouter.get(
  "/statuses",
  protect,
  instrumentController.getStatuses
);

/**
 * @swagger
 * /api/instruments/locations:
 *   get:
 *     summary: Lấy danh sách locations (Get instrument locations)
 *     tags: [Instruments]
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
 *                 status:
 *                   type: string
 *                   example: success
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 */
instrumentRouter.get(
  "/locations",
  protect,
  instrumentController.getLocations
);

// ==================== MAINTENANCE HISTORY ROUTES ====================

/**
 * @swagger
 * /api/instruments/maintenance-history/types:
 *   get:
 *     summary: Lấy danh sách loại bảo trì instrument (Get instrument maintenance types)
 *     description: Get distinct maintenance types for instruments (Preventive, Corrective, Calibration, Inspection, Replacement)
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instrument maintenance types retrieved successfully
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
 *                   example: Instrument maintenance types retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["PREVENTIVE", "CORRECTIVE", "CALIBRATION", "INSPECTION", "REPLACEMENT"]
 */
instrumentRouter.get(
  "/maintenance-history/types",
  protect,
  checkPermission(["VIEW_INSTRUMENT", "ALL"]),
  instrumentController.getInstrumentMaintenanceTypes
);

/**
 * @swagger
 * /api/instruments/maintenance-statuses:
 *   get:
 *     summary: Lấy danh sách trạng thái bảo trì instrument (Get instrument maintenance statuses)
 *     description: Get maintenance statuses for instruments (Completed, In Progress, Scheduled, Cancelled)
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instrument maintenance statuses retrieved successfully
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
 *                   example: Instrument maintenance statuses retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Completed", "In Progress", "Scheduled", "Cancelled"]
 */
instrumentRouter.get(
  "/maintenance-statuses",
  protect,
  checkPermission(["VIEW_INSTRUMENT", "ALL"]),
  instrumentController.getInstrumentMaintenanceStatuses
);

/**
 * @swagger
 * /api/instruments/maintenance-grouped:
 *   get:
 *     summary: Lấy bảo trì nhóm theo instrument (Get maintenance grouped by instrument)
 *     description: Get maintenance records grouped by instrument for accordion view. Returns groups with instrument info, summary stats, and nested records.
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by maintenance type (Preventive, Corrective, Calibration, etc.)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (Completed, In Progress, Scheduled, Cancelled)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description, performedBy, or instrument name
 *     responses:
 *       200:
 *         description: Maintenance records grouped by instrument retrieved successfully
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
 *                   example: Maintenance records grouped by instrument retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     groups:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           instrument:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: INS-001
 *                               name:
 *                                 type: string
 *                                 example: Alpha Platform
 *                               type:
 *                                 type: string
 *                                 example: Offshore Platform
 *                           records:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 date:
 *                                   type: string
 *                                   format: date-time
 *                                 type:
 *                                   type: string
 *                                 description:
 *                                   type: string
 *                                 performedBy:
 *                                   type: string
 *                                 status:
 *                                   type: string
 *                                 cost:
 *                                   type: number
 *                           statusSummary:
 *                             type: object
 *                             additionalProperties:
 *                               type: integer
 *                             example: {"Completed": 5, "In Progress": 2}
 *                           totalRecords:
 *                             type: integer
 *                           totalCost:
 *                             type: number
 *                     totalGroups:
 *                       type: integer
 *                     totalRecords:
 *                       type: integer
 *                     totalCost:
 *                       type: number
 */
instrumentRouter.get(
  "/maintenance-grouped",
  protect,
  checkPermission(["VIEW_INSTRUMENT", "ALL"]),
  instrumentController.getMaintenanceGrouped
);

/**
 * @swagger
 * /api/instruments/maintenance-history:
 *   get:
 *     summary: Lấy tất cả lịch sử bảo trì instrument (Get all instrument maintenance history)
 *     description: Get maintenance history of all instruments with pagination and filters
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string of filters (e.g. {"type":"Preventive","status":"Completed","instrumentId":"objectId"})
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: All instrument maintenance history retrieved successfully
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
 *                   example: All instrument maintenance history retrieved successfully
 *                 data:
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
 *                           instrumentId:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           type:
 *                             type: string
 *                           description:
 *                             type: string
 *                           performedBy:
 *                             type: string
 *                           status:
 *                             type: string
 *                           cost:
 *                             type: number
 *                           instrument:
 *                             type: object
 *                             properties:
 *                               instrumentId:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               model:
 *                                 type: string
 *                               location:
 *                                 type: string
 */
instrumentRouter.get(
  "/maintenance-history",
  protect,
  checkPermission(["VIEW_INSTRUMENT", "ALL"]),
  instrumentController.getAllInstrumentMaintenanceHistory
);

// ==================== LIST AND CREATE ROUTES ====================

/**
 * @swagger
 * /api/instruments:
 *   get:
 *     summary: Lấy danh sách instruments (Get all instruments)
 *     tags: [Instruments]
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, instrumentId, manufacturer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by type (exact match)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (exact match)
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location (partial match, case-insensitive)
 *     responses:
 *       200:
 *         description: Success
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Instrument'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */
instrumentRouter.get(
  "/",
  protect,
  checkPermission(["VIEW_INSTRUMENT", "ALL"]),
  instrumentController.getAllInstruments
);

/**
 * @swagger
 * /api/instruments:
 *   post:
 *     summary: Tạo instrument mới (Create new instrument)
 *     tags: [Instruments]
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
 *               - type
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *                 example: New Platform
 *               type:
 *                 type: string
 *                 enum: [Offshore Platform, Onshore Rig, FPSO, Jack-up Rig, Semi-submersible]
 *                 example: Offshore Platform
 *               location:
 *                 type: string
 *                 example: Gulf of Mexico - Block 42
 *               manufacturer:
 *                 type: string
 *                 example: Keppel Offshore
 *               model:
 *                 type: string
 *                 example: KFELS B Class
 *               installDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-15
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Maintenance]
 *                 default: Active
 *               description:
 *                 type: string
 *                 example: Optional description
 *     responses:
 *       201:
 *         description: Instrument created successfully
 *       400:
 *         description: Bad request (validation error, duplicate code)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
instrumentRouter.post(
  "/",
  protect,
  checkPermission(["ALL"]),
  instrumentController.createInstrument
);

// ==================== SINGLE INSTRUMENT ROUTES ====================

/**
 * @swagger
 * /api/instruments/{id}:
 *   get:
 *     summary: Lấy chi tiết instrument (Get instrument by ID)
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Instrument ID (INS-001, INS-002, etc.)
 *     responses:
 *       200:
 *         description: Success
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
 *                 data:
 *                   $ref: '#/components/schemas/Instrument'
 *       404:
 *         description: Instrument not found
 */
instrumentRouter.get(
  "/:id",
  protect,
  checkPermission(["VIEW_INSTRUMENT", "VIEW_INSTRUMENT_DETAILS", "ALL"]),
  instrumentController.getInstrumentById
);

/**
 * @swagger
 * /api/instruments/{id}:
 *   put:
 *     summary: Cập nhật instrument (Update instrument)
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Instrument ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [Offshore Platform, Onshore Rig, FPSO, Jack-up Rig, Semi-submersible]
 *               location:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               model:
 *                 type: string
 *               installDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Maintenance, Decommissioned]
 *               description:
 *                 type: string
 *               lastMaintenanceDate:
 *                 type: string
 *                 format: date
 *               nextMaintenanceDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Instrument updated successfully
 *       400:
 *         description: Bad request (validation error)
 *       404:
 *         description: Instrument not found
 */
instrumentRouter.put(
  "/:id",
  protect,
  checkPermission(["UPDATE_INSTRUMENT", "ALL"]),
  instrumentController.updateInstrument
);

/**
 * @swagger
 * /api/instruments/{id}/decommission:
 *   patch:
 *     summary: Ngừng hoạt động instrument (Decommission instrument)
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Instrument ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for decommission
 *                 example: End of operational life
 *     responses:
 *       200:
 *         description: Instrument decommissioned successfully
 *       400:
 *         description: Bad request (already decommissioned)
 *       404:
 *         description: Instrument not found
 */
instrumentRouter.patch(
  "/:id/decommission",
  protect,
  checkPermission(["ALL"]),
  instrumentController.decommissionInstrument
);

// ==================== ENGINEER ASSIGNMENT ROUTES ====================

/**
 * @swagger
 * /api/instruments/{id}/assign:
 *   post:
 *     summary: Gán kỹ sư cho instrument (Assign engineer to instrument)
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Instrument ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - engineerId
 *               - role
 *             properties:
 *               engineerId:
 *                 type: string
 *                 description: User ObjectId of the engineer
 *                 example: 507f1f77bcf86cd799439011
 *               role:
 *                 type: string
 *                 enum: [Primary, Support]
 *                 description: Engineer role for this instrument
 *                 example: Primary
 *     responses:
 *       201:
 *         description: Engineer assigned successfully
 *       400:
 *         description: Bad request (invalid role, already assigned, user not an engineer)
 *       404:
 *         description: Instrument or engineer not found
 */
instrumentRouter.post(
  "/:id/assign",
  protect,
  checkPermission(["ASSIGN_ENGINEER_INSTRUMENT", "ALL"]),
  instrumentController.assignEngineer
);

/**
 * @swagger
 * /api/instruments/{id}/assign/{engineerId}:
 *   delete:
 *     summary: Xóa gán kỹ sư khỏi instrument (Remove engineer assignment)
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Instrument ID
 *       - in: path
 *         name: engineerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Engineer User ObjectId
 *     responses:
 *       200:
 *         description: Engineer assignment removed successfully
 *       404:
 *         description: Instrument or assignment not found
 */
instrumentRouter.delete(
  "/:id/assign/:engineerId",
  protect,
  checkPermission(["ASSIGN_ENGINEER_INSTRUMENT", "ALL"]),
  instrumentController.removeEngineerAssignment
);

/**
 * @swagger
 * /api/instruments/{instrumentId}/maintenance-history:
 *   get:
 *     summary: Lấy lịch sử bảo trì của một instrument (Get maintenance history for an instrument)
 *     description: Get maintenance history for a specific instrument by its instrumentId (INS-001, INS-002, etc.)
 *     tags: [Instruments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instrumentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Instrument ID (INS-001, INS-002, etc.)
 *         example: INS-001
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Instrument maintenance history retrieved successfully
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
 *                   example: Instrument maintenance history retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       instrumentId:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       type:
 *                         type: string
 *                       description:
 *                         type: string
 *                       performedBy:
 *                         type: string
 *                       status:
 *                         type: string
 *                       cost:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Instrument not found
 */
instrumentRouter.get(
  "/:instrumentId/maintenance-history",
  protect,
  checkPermission(["VIEW_INSTRUMENT", "ALL"]),
  instrumentController.getInstrumentMaintenanceHistory
);

export default instrumentRouter;
