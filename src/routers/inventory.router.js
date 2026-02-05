import express from 'express';
import { inventoryController } from '../controllers/inventory.controller.js';
import { protect } from '../common/middlewares/protect.middleware.js';

const inventoryRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: API quản lý tồn kho (Inventory Management)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Inventory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Inventory ID
 *         warehouseId:
 *           type: string
 *           description: Warehouse ID
 *         equipmentId:
 *           type: string
 *           description: Equipment ID
 *         quantity:
 *           type: integer
 *           description: Current quantity in stock
 *         stockStatus:
 *           type: string
 *           enum: [IN_STOCK, LOW, OUT_OF_STOCK]
 *           description: Stock status (>=100=IN_STOCK, 10-99=LOW, <10=OUT_OF_STOCK)
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     
 *     ReceiveInventoryRequest:
 *       type: object
 *       required:
 *         - warehouse_id
 *         - equipment_id
 *         - quantity
 *         - supplier_name
 *         - date_received
 *       properties:
 *         warehouse_id:
 *           type: string
 *           description: Kho nhận hàng
 *           example: "6578abc123def456789"
 *         equipment_id:
 *           type: string
 *           description: Equipment/SKU ID
 *           example: "6578def123abc456789"
 *         quantity:
 *           type: integer
 *           description: Số lượng nhập
 *           example: 50
 *         supplier_name:
 *           type: string
 *           description: Tên nhà cung cấp
 *           example: "ABC Supplier Co."
 *         date_received:
 *           type: string
 *           format: date
 *           description: Ngày nhập hàng
 *           example: "2026-02-05"
 *         notes:
 *           type: string
 *           description: Ghi chú (optional)
 *           example: "Emergency restock"
 *     
 *     DispatchInventoryRequest:
 *       type: object
 *       required:
 *         - warehouse_id
 *         - equipment_id
 *         - quantity
 *         - destination
 *         - date_dispatched
 *       properties:
 *         warehouse_id:
 *           type: string
 *           description: Kho xuất hàng
 *           example: "6578abc123def456789"
 *         equipment_id:
 *           type: string
 *           description: Equipment/SKU ID
 *           example: "6578def123abc456789"
 *         quantity:
 *           type: integer
 *           description: Số lượng xuất
 *           example: 30
 *         destination:
 *           type: string
 *           description: Điểm đến
 *           example: "Site A - Platform 3"
 *         date_dispatched:
 *           type: string
 *           format: date
 *           description: Ngày xuất hàng
 *           example: "2026-02-05"
 *         notes:
 *           type: string
 *           description: Ghi chú (optional)
 *           example: "Routine maintenance supply"
 *     
 *     InventoryLedger:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Ledger ID
 *         inventoryId:
 *           type: string
 *           description: Inventory ID
 *         movementType:
 *           type: string
 *           enum: [RECEIVE, DISPATCH]
 *           description: Loại giao dịch
 *         quantity:
 *           type: integer
 *           description: Số lượng
 *         supplierName:
 *           type: string
 *           description: Nhà cung cấp (cho RECEIVE)
 *         destination:
 *           type: string
 *           description: Điểm đến (cho DISPATCH)
 *         receiverId:
 *           type: string
 *           description: User thực hiện
 *         notes:
 *           type: string
 *           description: Ghi chú
 *         dateReceived:
 *           type: string
 *           format: date-time
 *           description: Ngày nhập (cho RECEIVE)
 *         dateDispatched:
 *           type: string
 *           format: date-time
 *           description: Ngày xuất (cho DISPATCH)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp tạo record
 */

/**
 * @swagger
 * /api/inventory/receive:
 *   post:
 *     summary: Nhập hàng vào kho (Receive Inventory - Inbound)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReceiveInventoryRequest'
 *     responses:
 *       201:
 *         description: Nhập hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Inventory received successfully"
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   type: object
 *                   properties:
 *                     inventory:
 *                       $ref: '#/components/schemas/Inventory'
 *                     ledger:
 *                       $ref: '#/components/schemas/InventoryLedger'
 *       400:
 *         description: Bad request - Missing fields or invalid data
 *       404:
 *         description: Warehouse or Equipment not found
 */
inventoryRouter.post('/receive', protect, inventoryController.receiveInventory);

/**
 * @swagger
 * /api/inventory/dispatch:
 *   post:
 *     summary: Xuất hàng khỏi kho (Dispatch Inventory - Outbound)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DispatchInventoryRequest'
 *     responses:
 *       200:
 *         description: Xuất hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Inventory dispatched successfully"
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     inventory:
 *                       $ref: '#/components/schemas/Inventory'
 *                     ledger:
 *                       $ref: '#/components/schemas/InventoryLedger'
 *                     alert:
 *                       type: object
 *                       description: Low stock alert (nếu có)
 *                       properties:
 *                         message:
 *                           type: string
 *                         stockStatus:
 *                           type: string
 *                         currentQuantity:
 *                           type: integer
 *       400:
 *         description: Bad request - Insufficient stock or invalid data
 *       404:
 *         description: Warehouse, Equipment, or Inventory not found
 */
inventoryRouter.post('/dispatch', protect, inventoryController.dispatchInventory);

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Lấy danh sách tồn kho với bộ lọc (Inventory Report / View)
 *     tags: [Inventory]
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
 *         description: Số items mỗi trang
 *       - in: query
 *         name: warehouse_id
 *         schema:
 *           type: string
 *         description: Lọc theo kho
 *       - in: query
 *         name: item_type
 *         schema:
 *           type: string
 *         description: Lọc theo loại thiết bị (Pump, Valve, etc.)
 *       - in: query
 *         name: sku
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo SKU/Equipment ID
 *       - in: query
 *         name: quantity_min
 *         schema:
 *           type: integer
 *         description: Số lượng tối thiểu
 *       - in: query
 *         name: quantity_max
 *         schema:
 *           type: integer
 *         description: Số lượng tối đa
 *       - in: query
 *         name: stock_status
 *         schema:
 *           type: string
 *           enum: [IN_STOCK, LOW, OUT_OF_STOCK]
 *         description: Lọc theo trạng thái tồn kho
 *     responses:
 *       200:
 *         description: Danh sách inventory thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Get all inventory successfully"
 *                 statusCode:
 *                   type: integer
 *                   example: 200
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
 *                           equipment_id:
 *                             type: string
 *                           item_name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           sku:
 *                             type: string
 *                           quantity_available:
 *                             type: integer
 *                           warehouse_location:
 *                             type: string
 *                           warehouse_id:
 *                             type: string
 *                           warehouse_name:
 *                             type: string
 *                           stock_status:
 *                             type: string
 *                           last_updated:
 *                             type: string
 *                             format: date-time
 */
inventoryRouter.get('/', protect, inventoryController.getAllInventory);

/**
 * @swagger
 * /api/inventory/{inventoryId}:
 *   get:
 *     summary: Lấy chi tiết inventory theo ID (hỗ trợ ObjectId hoặc Custom ID)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inventoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory ID (ObjectId hoặc Custom ID như INV-001)
 *         example: INV-001
 *     responses:
 *       200:
 *         description: Chi tiết inventory
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
 *       404:
 *         description: Inventory not found
 */
inventoryRouter.get('/:inventoryId', protect, inventoryController.getInventoryById);

/**
 * @swagger
 * /api/inventory/ledger/history:
 *   get:
 *     summary: Lấy lịch sử giao dịch inventory (Inventory Ledger)
 *     tags: [Inventory]
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
 *         name: inventory_id
 *         schema:
 *           type: string
 *         description: Lọc theo inventory ID
 *       - in: query
 *         name: movement_type
 *         schema:
 *           type: string
 *           enum: [RECEIVE, DISPATCH]
 *         description: Lọc theo loại giao dịch
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Từ ngày
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Đến ngày
 *     responses:
 *       200:
 *         description: Lịch sử giao dịch thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
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
 *                         $ref: '#/components/schemas/InventoryLedger'
 */
inventoryRouter.get('/ledger/history', protect, inventoryController.getInventoryLedger);

export { inventoryRouter };
