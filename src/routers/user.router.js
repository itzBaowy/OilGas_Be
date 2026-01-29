import express from "express";
import { userController } from "../controllers/user.controller.js";
import { protect } from "../common/middlewares/protect.middleware.js";
import { uploadMemory } from "../common/multer/memory.multer.js";
import { checkPermission } from "../common/middlewares/authorization.middleware.js";

const userRouter = express.Router();

/**
 * @swagger
 * tags:    
 *   name: Users
 *   description: API quản lý người dùng
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy danh sách người dùng (có phân trang và lọc)
 *     tags: [Users]
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
 *           default: 3
 *           minimum: 1
 *         description: Số lượng item trên mỗi trang
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string để lọc dữ liệu (ví dụ {"email":"example","fullName":"John"})
 *         example: '{"fullName":"John"}'
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
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Get all users successfully
 *                 content:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 3
 *                     totalItem:
 *                       type: integer
 *                       example: 10
 *                     totalPage:
 *                       type: integer
 *                       example: 4
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           phoneNumber:
 *                             type: string
 *                           roleId:
 *                             type: string
 *                           status:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 */
userRouter.get("/", protect, checkPermission(['VIEW_USER', 'ALL']), userController.getAllUsers);

/**
 * @swagger
 * /api/users/avatar-cloud:
 *   post:
 *     summary: Upload avatar lên Cloudinary
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh avatar (jpg, jpeg, png, gif)
 *             required:
 *               - avatar
 *     responses:
 *       200:
 *         description: Upload avatar thành công
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
 *                   example: Upload avatar successfully
 *                 content:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Không có file hoặc file không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Không có file
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 */
userRouter.post("/avatar-cloud", protect, uploadMemory.single("avatar"), userController.avatarCloud);


export default userRouter;
