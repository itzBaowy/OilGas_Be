import express from "express";
import { oilTransactionController } from "../controllers/oilTransaction.controller.js";
import { protect } from "../common/middlewares/protect.middleware.js";
import { checkPermission } from "../common/middlewares/authorization.middleware.js";

const oilTransactionRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Oil Transactions
 *   description: API quản lý xuất nhập dầu (Oil Transaction Management)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OilTransaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         transactionId:
 *           type: string
 *           description: "Custom ID: OT-001, OT-002..."
 *         transactionType:
 *           type: string
 *           enum: [EXTRACTION, INSTRUMENT_TO_WAREHOUSE, WAREHOUSE_TO_WAREHOUSE]
 *         fromType:
 *           type: string
 *           enum: [INSTRUMENT, WAREHOUSE]
 *         fromId:
 *           type: string
 *         toType:
 *           type: string
 *           enum: [WAREHOUSE]
 *         toId:
 *           type: string
 *         oilType:
 *           type: string
 *           description: "e.g. Crude Oil - Brent"
 *         quantity:
 *           type: number
 *           description: "Quantity in liters"
 *         transportMethod:
 *           type: string
 *           enum: [Pipeline, Tanker, Barge]
 *         status:
 *           type: string
 *           enum: [COMPLETED, CANCELLED]
 *         note:
 *           type: string
 *         createdBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     ExtractOilRequest:
 *       type: object
 *       required:
 *         - instrument_id
 *         - equipment_id
 *       properties:
 *         instrument_id:
 *           type: string
 *           description: "Instrument ID (ObjectId or INS-001)"
 *           example: "INS-001"
 *         equipment_id:
 *           type: string
 *           description: "Oil Pump Equipment ID (ObjectId or EQ-PUMP-001)"
 *           example: "EQ-PUMP-001"
 *
 *     DispatchOilRequest:
 *       type: object
 *       required:
 *         - instrument_id
 *         - warehouse_id
 *         - quantity
 *       properties:
 *         instrument_id:
 *           type: string
 *           description: "Source Instrument ID"
 *           example: "INS-001"
 *         warehouse_id:
 *           type: string
 *           description: "Destination Warehouse ID"
 *           example: "WH-001"
 *         quantity:
 *           type: number
 *           description: "Quantity in liters"
 *           example: 2000
 *         transport_method:
 *           type: string
 *           description: "Transport method"
 *           example: "Pipeline"
 *         note:
 *           type: string
 *           example: "Regular dispatch"
 *
 *     TransferOilRequest:
 *       type: object
 *       required:
 *         - from_warehouse_id
 *         - to_warehouse_id
 *         - quantity
 *       properties:
 *         from_warehouse_id:
 *           type: string
 *           description: "Source Warehouse ID"
 *           example: "WH-001"
 *         to_warehouse_id:
 *           type: string
 *           description: "Destination Warehouse ID"
 *           example: "WH-002"
 *         quantity:
 *           type: number
 *           description: "Quantity in liters"
 *           example: 5000
 *         oil_type:
 *           type: string
 *           example: "Crude Oil - Brent"
 *         transport_method:
 *           type: string
 *           example: "Tanker"
 *         note:
 *           type: string
 *           example: "Balance warehouse stock"
 */

/**
 * @swagger
 * /api/oil-transactions/extract:
 *   post:
 *     summary: Extract oil using Oil Pump
 *     description: Simulate oil extraction - increases instrument oil tank volume
 *     tags: [Oil Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExtractOilRequest'
 *     responses:
 *       201:
 *         description: Oil extracted successfully
 *       400:
 *         description: Tank full or invalid equipment
 *       404:
 *         description: Instrument or equipment not found
 */
oilTransactionRouter.post("/extract", protect, checkPermission(["EXTRACT_OIL", "ALL"]), oilTransactionController.extractOil);

/**
 * @swagger
 * /api/oil-transactions/dispatch:
 *   post:
 *     summary: Dispatch oil from Instrument to Warehouse
 *     description: Transfer oil from instrument tank to warehouse storage
 *     tags: [Oil Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DispatchOilRequest'
 *     responses:
 *       201:
 *         description: Oil dispatched successfully
 *       400:
 *         description: Insufficient oil or warehouse capacity exceeded
 *       404:
 *         description: Instrument or warehouse not found
 */
oilTransactionRouter.post("/dispatch", protect, checkPermission(["DISPATCH_OIL", "ALL"]), oilTransactionController.dispatchOil);

/**
 * @swagger
 * /api/oil-transactions/transfer:
 *   post:
 *     summary: Transfer oil between Warehouses
 *     description: Transfer oil from one warehouse to another
 *     tags: [Oil Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferOilRequest'
 *     responses:
 *       201:
 *         description: Oil transferred successfully
 *       400:
 *         description: Insufficient oil or capacity exceeded
 *       404:
 *         description: Warehouse not found
 */
oilTransactionRouter.post("/transfer", protect, checkPermission(["TRANSFER_OIL", "ALL"]), oilTransactionController.transferOil);

/**
 * @swagger
 * /api/oil-transactions/summary:
 *   get:
 *     summary: Get oil system summary
 *     description: Overview of oil across all instruments and warehouses
 *     tags: [Oil Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Oil summary data
 */
oilTransactionRouter.get("/summary", protect, checkPermission(["VIEW_OIL_TRANSACTIONS", "ALL"]), oilTransactionController.getOilSummary);

/**
 * @swagger
 * /api/oil-transactions:
 *   get:
 *     summary: Get all oil transactions
 *     description: List oil transactions with pagination and filters
 *     tags: [Oil Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: transaction_type
 *         schema:
 *           type: string
 *           enum: [EXTRACTION, INSTRUMENT_TO_WAREHOUSE, WAREHOUSE_TO_WAREHOUSE]
 *       - in: query
 *         name: oil_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of oil transactions
 */
oilTransactionRouter.get("/", protect, checkPermission(["VIEW_OIL_TRANSACTIONS", "ALL"]), oilTransactionController.getAllTransactions);

// ===== OIL PUMP ASSIGNMENT (must be before /:id to avoid param catch) =====

/**
 * @swagger
 * /api/oil-transactions/pumps/unassigned:
 *   get:
 *     summary: Get all unassigned Oil Pump equipment
 *     tags: [Oil Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unassigned Oil Pumps
 */
oilTransactionRouter.get("/pumps/unassigned", protect, checkPermission(["EXTRACT_OIL", "ALL"]), oilTransactionController.getUnassignedOilPumps);

/**
 * @swagger
 * /api/oil-transactions/pumps/assign:
 *   post:
 *     summary: Assign Oil Pump to Instrument
 *     tags: [Oil Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - equipment_id
 *               - instrument_id
 *             properties:
 *               equipment_id:
 *                 type: string
 *               instrument_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Oil pump assigned successfully
 */
oilTransactionRouter.post("/pumps/assign", protect, checkPermission(["EXTRACT_OIL", "ALL"]), oilTransactionController.assignOilPump);

/**
 * @swagger
 * /api/oil-transactions/pumps/{id}/unassign:
 *   patch:
 *     summary: Unassign Oil Pump from Instrument
 *     tags: [Oil Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Equipment ID (ObjectId or EQ-PUMP-001)"
 *     responses:
 *       200:
 *         description: Oil pump unassigned successfully
 */
oilTransactionRouter.patch("/pumps/:id/unassign", protect, checkPermission(["EXTRACT_OIL", "ALL"]), oilTransactionController.unassignOilPump);

// ===== AUTO-EXTRACT ROUTES (before /:id) =====
oilTransactionRouter.post("/auto-extract/start", protect, checkPermission(["EXTRACT_OIL", "ALL"]), oilTransactionController.startAutoExtract);
oilTransactionRouter.post("/auto-extract/stop", protect, checkPermission(["EXTRACT_OIL", "ALL"]), oilTransactionController.stopAutoExtract);
oilTransactionRouter.get("/auto-extract/status/:instrumentId", protect, checkPermission(["EXTRACT_OIL", "VIEW_OIL_TRANSACTIONS", "ALL"]), oilTransactionController.getAutoExtractStatus);

/**
 * @swagger
 * /api/oil-transactions/{id}:
 *   get:
 *     summary: Get oil transaction by ID
 *     tags: [Oil Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Transaction ID (ObjectId or OT-001)"
 *     responses:
 *       200:
 *         description: Transaction detail
 *       404:
 *         description: Transaction not found
 */
oilTransactionRouter.get("/:id", protect, checkPermission(["VIEW_OIL_TRANSACTIONS", "ALL"]), oilTransactionController.getTransactionById);

export { oilTransactionRouter };
