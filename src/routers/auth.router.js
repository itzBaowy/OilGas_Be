import express from 'express';
// Lưu ý: Dùng dấu { } để import vì bên controller là named export
import { authController } from '../controllers/auth.controller.js';
import { protect } from '../common/middlewares/protect.middleware.js';
import passport from 'passport';
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API xác thực
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 */
router.post('/login', authController.login);


/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Làm mới token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token còn hiệu lực
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: Làm mới token thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Token không hợp lệ
 */
router.post("/refresh-token", authController.refreshToken)

/**
 * @swagger
 * /api/auth/get-info:
 *   get:
 *     summary: Lấy thông tin người dùng
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 fullName:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 roleId:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                 role:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/get-info", protect, authController.getInfo);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Đổi mật khẩu
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *             required:
 *               - oldPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu cũ không đúng
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/change-password', protect, authController.changePassword);


/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Đăng nhập bằng Google OAuth
 *     tags: [Auth]
 *     description: Redirect người dùng đến trang đăng nhập Google
 *     responses:
 *       302:
 *         description: Redirect đến Google OAuth
 */
// kích hoạt logic của passport, để pasport xử lý với google, cùng với yêu cầu tôi muốn lấy email, và profile của người dùng
// sau khi passport làm việc với google xong, passport sẽ tự redirect người dùng tới trang đăng nhập google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


// Sau khi người dùng chọn tài khoản gmail và đồng ý với bên google
// Passport sẽ lấy code và xử lý với bên google => lấy thông tin gmail => kích hoạt hàm verify ở trong src/common/passport/login-google.passport.js
router.get("/google-callback", passport.authenticate('google', { failureRedirect: '/login', session: false }), authController.googleCallback);
export default router;