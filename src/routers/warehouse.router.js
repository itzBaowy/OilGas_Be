import express from 'express';
import { warehouseController } from '../controllers/warehouse.controller.js';
import { protect } from '../common/middlewares/protect.middleware.js';

const warehouseRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Warehouses
 *   description: API quản lý kho
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Warehouse:
 *       type: object
 *       required:
 *         - name
 *         - location
 *         - capacity
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           description: ID tự động tạo (warehouse_id)
 *         name:
 *           type: string
 *           description: Tên kho (Warehouse Name)
 *         location:
 *           type: string
 *           description: Địa chỉ kho (Location/Address)
 *         capacity:
 *           type: integer
 *           description: Sức chứa kho - đơn vị (Capacity Units)
 *         description:
 *           type: string
 *           description: Mô tả / ghi chú vận hành (Description/Notes - Optional)
 *         status:
 *           type: string
 *           enum: [ACTIVE, MAINTENANCE]
 *           description: Trạng thái kho (Status - Active/Maintenance)
 *         createdBy:
 *           type: string
 *           description: ID người tạo (created_by - System)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian tạo (created_at - System)
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian cập nhật
 */

/**
 * @swagger
 * /api/warehouses:
 *   get:
 *     summary: Lấy danh sách kho với phân trang
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng items mỗi trang
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: |
 *           Bộ lọc dạng JSON string. 
 *           Ví dụ: {"status":"MAINTENANCE"} để lọc theo trạng thái.
 *           Các field có thể lọc: status (exact match)
 *         example: '{"status":"MAINTENANCE"}'
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
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
 *                         $ref: '#/components/schemas/Warehouse'
 */
warehouseRouter.get('/', protect, warehouseController.getAllWarehouses);

/**
 * @swagger
 * /api/warehouses/{warehouseId}:
 *   get:
 *     summary: Lấy chi tiết kho theo ID
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kho (Warehouse ID)
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Warehouse'
 *       404:
 *         description: Không tìm thấy kho
 */
warehouseRouter.get('/:warehouseId', protect, warehouseController.getWarehouseById);

/**
 * @swagger
 * /api/warehouses:
 *   post:
 *     summary: Tạo kho mới (Create Warehouse)
 *     tags: [Warehouses]
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
 *               - location
 *               - capacity
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên kho (Warehouse Name - Required)
 *                 example: Kho Hà Nội
 *               location:
 *                 type: string
 *                 description: Địa chỉ kho (Location/Address - Required)
 *                 example: 123 Đường ABC, Hà Nội
 *               capacity:
 *                 type: integer
 *                 description: Sức chứa kho - phải > 0 (Capacity Units - Required)
 *                 example: 1000
 *               description:
 *                 type: string
 *                 description: Mô tả / ghi chú vận hành (Description/Notes - Optional)
 *                 example: Kho chính tại miền Bắc
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, MAINTENANCE]
 *                 description: Trạng thái kho (Status - Required, Active/Maintenance)
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Tạo kho thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Warehouse'
 *       400:
 *         description: |
 *           Validation errors:
 *           - Required fields missing (name, location, capacity, status)
 *           - Capacity must be > 0
 *           - Unique name + location violated (warehouse already exists)
 *           - Invalid status value
 */
warehouseRouter.post('/', protect, warehouseController.createWarehouse);

/**
 * @swagger
 * /api/warehouses/{warehouseId}:
 *   put:
 *     summary: Cập nhật thông tin kho (Update Warehouse)
 *     description: |
 *       Update warehouse master data. 
 *       Validation rules:
 *       - Check warehouse exists
 *       - Prevent duplicate name/location
 *       - Capacity must be > 0
 *       - Save old/new values for audit
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kho (Warehouse ID - Required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên kho (Warehouse Name - có thể đổi tên)
 *                 example: Kho Hà Nội - Cập nhật
 *               location:
 *                 type: string
 *                 description: Địa chỉ kho (Location - có thể đổi địa chỉ)
 *                 example: 456 Đường XYZ, Hà Nội
 *               capacity:
 *                 type: integer
 *                 description: Sức chứa kho - phải > 0 (Capacity - mở rộng/thu nhỏ)
 *                 example: 1500
 *               description:
 *                 type: string
 *                 description: Mô tả / ghi chú (Description - cập nhật ghi chú)
 *                 example: Đã mở rộng kho
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, MAINTENANCE]
 *                 description: Trạng thái kho (Status - đóng/mở kho)
 *                 example: MAINTENANCE
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Warehouse'
 *       400:
 *         description: |
 *           Validation errors:
 *           - Capacity must be > 0
 *           - Duplicate name/location
 *           - Invalid status
 *       404:
 *         description: Warehouse does not exist
 */
warehouseRouter.put('/:warehouseId', protect, warehouseController.updateWarehouse);

/**
 * @swagger
 * /api/warehouses/{warehouseId}:
 *   delete:
 *     summary: Xóa kho
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kho
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy kho
 */
warehouseRouter.delete('/:warehouseId', protect, warehouseController.deleteWarehouse);

/**
 * @swagger
 * /api/warehouses/{warehouseId}/status:
 *   patch:
 *     summary: Cập nhật trạng thái kho (Warehouse lifecycle)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kho
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, MAINTENANCE]
 *                 description: Trạng thái mới của kho
 *                 example: MAINTENANCE
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Warehouse'
 *       400:
 *         description: Trạng thái không hợp lệ
 *       404:
 *         description: Không tìm thấy kho
 */
warehouseRouter.patch('/:warehouseId/status', protect, warehouseController.updateWarehouseStatus);

export default warehouseRouter;
