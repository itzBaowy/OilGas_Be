import express from "express";
import { roleController } from "../controllers/role.controller.js";
import { protect } from "../common/middlewares/protect.middleware.js";
import { checkPermission } from "../common/middlewares/authorization.middleware.js";

const roleRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: API quản lý roles và permissions
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Lấy danh sách roles (có phân trang và lọc)
 *     tags: [Roles]
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
 *         description: Số lượng item trên mỗi trang
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string để lọc (ví dụ {"name":"admin"})
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
roleRouter.get("/", protect, checkPermission(['VIEW_ROLE', 'ALL']), roleController.getAllRoles);

/**
 * @swagger
 * /api/roles/{roleId}:
 *   get:
 *     summary: Lấy thông tin role theo ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của role
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       404:
 *         description: Role không tồn tại
 *       403:
 *         description: Không có quyền truy cập
 */
roleRouter.get("/:roleId", protect, checkPermission(['VIEW_ROLE', 'ALL']), roleController.getRoleById);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Tạo role mới
 *     tags: [Roles]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Moderator"
 *               description:
 *                 type: string
 *                 example: "Moderator role with limited permissions"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["VIEW_USER", "EDIT_USER"]
 *     responses:
 *       200:
 *         description: Tạo role thành công
 *       400:
 *         description: Role đã tồn tại hoặc dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền truy cập (cần CREATE_ROLE)
 */
roleRouter.post("/", protect, checkPermission(['CREATE_ROLE', 'ALL']), roleController.createRole);

/**
 * @swagger
 * /api/roles/{roleId}:
 *   put:
 *     summary: Cập nhật role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Moderator"
 *               description:
 *                 type: string
 *                 example: "Moderator role with limited permissions"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["VIEW_USER", "EDIT_USER"]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Role không tồn tại
 *       403:
 *         description: Không có quyền truy cập (cần UPDATE_ROLE)
 */
roleRouter.put("/:roleId", protect, checkPermission(['UPDATE_ROLE', 'ALL']), roleController.updateRole);

/**
 * @swagger
 * /api/roles/{roleId}:
 *   delete:
 *     summary: Xóa role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Không thể xóa vì còn user đang dùng role này
 *       404:
 *         description: Role không tồn tại
 *       403:
 *         description: Không có quyền truy cập (cần DELETE_ROLE)
 */
roleRouter.delete("/:roleId", protect, checkPermission(['DELETE_ROLE', 'ALL']), roleController.deleteRole);

/**
 * @swagger
 * /api/roles/{roleId}/permissions:
 *   post:
 *     summary: Thêm permission vào role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permission
 *             properties:
 *               permission:
 *                 type: string
 *                 example: "DELETE_USER"
 *     responses:
 *       200:
 *         description: Thêm permission thành công
 *       400:
 *         description: Permission đã tồn tại
 *       403:
 *         description: Không có quyền truy cập (cần UPDATE_ROLE)
 */
roleRouter.post("/:roleId/permissions", protect, checkPermission(['UPDATE_ROLE', 'ALL']), roleController.addPermission);

/**
 * @swagger
 * /api/roles/{roleId}/permissions:
 *   delete:
 *     summary: Xóa permission khỏi role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permission
 *             properties:
 *               permission:
 *                 type: string
 *                 example: "DELETE_USER"
 *     responses:
 *       200:
 *         description: Xóa permission thành công
 *       400:
 *         description: Permission không tồn tại
 *       403:
 *         description: Không có quyền truy cập (cần UPDATE_ROLE)
 */
roleRouter.delete("/:roleId/permissions", protect, checkPermission(['UPDATE_ROLE', 'ALL']), roleController.removePermission);

/**
 * @swagger
 * /api/roles/{roleId}/permissions:
 *   put:
 *     summary: Cập nhật toàn bộ permissions của role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["VIEW_USER", "CREATE_USER", "EDIT_USER"]
 *     responses:
 *       200:
 *         description: Cập nhật permissions thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền truy cập (cần UPDATE_ROLE)
 */
roleRouter.put("/:roleId/permissions", protect, checkPermission(['UPDATE_ROLE', 'ALL']), roleController.updatePermissions);

export default roleRouter;
