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
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Tạo người dùng mới
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - phoneNumber
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@gmail.com
 *                 description: Email người dùng (phải unique)
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *                 description: Mật khẩu (tối thiểu 6 ký tự)
 *               fullName:
 *                 type: string
 *                 example: Nguyễn Văn A
 *                 description: Họ và tên đầy đủ
 *               phoneNumber:
 *                 type: string
 *                 example: "0901234567"
 *                 description: Số điện thoại
 *               roleName:
 *                 type: string
 *                 example: Moderator
 *                 description: Teen
 *     responses:
 *       200:
 *         description: Tạo user thành công
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
 *                   example: Create user successfully
 *                 content:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     roleId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: ACTIVE
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     role:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Email đã tồn tại hoặc dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền CREATE_USER
 */
userRouter.post("/", protect, checkPermission(['CREATE_USER', 'ALL']), userController.createUsers);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     summary: Cập nhật thông tin người dùng
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Nguyễn Văn B
 *                 description: Họ và tên đầy đủ
 *               phoneNumber:
 *                 type: string
 *                 example: "0901234567"
 *                 description: Số điện thoại
 *               roleName:
 *                 type: string
 *                 example: Supervisor
 *                 description: Tên role mới
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: ACTIVE
 *                 description: Trạng thái tài khoản
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
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Update user successfully
 *                 content:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     roleId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Người dùng không tồn tại
 *       403:
 *         description: Không có quyền EDIT_USER
 */
userRouter.put("/:userId", protect, checkPermission(['EDIT_USER', 'ALL']), userController.updateUser);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Xóa người dùng
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng cần xóa
 *     responses:
 *       200:
 *         description: Xóa thành công
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
 *                   example: Delete user successfully
 *                 content:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Không thể xóa user đang đăng nhập hoặc Admin
 *       404:
 *         description: Người dùng không tồn tại
 *       403:
 *         description: Không có quyền DELETE_USER
 */
userRouter.delete("/:userId", protect, checkPermission(['DELETE_USER', 'ALL']), userController.deleteUser);

export default userRouter;
