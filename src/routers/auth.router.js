import express from 'express';
// Lưu ý: Dùng dấu { } để import vì bên controller là named export
import { authController } from '../controllers/auth.controller.js';
import { protect } from '../common/middlewares/protect.middleware.js';
import passport from 'passport';
const authRouter = express.Router();

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
authRouter.post('/register', authController.register);

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
authRouter.post('/login', authController.login);


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
authRouter.post("/refresh-token", authController.refreshToken)

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
authRouter.get("/get-info", protect, authController.getInfo);

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
authRouter.post('/change-password', protect, authController.changePassword);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Yêu cầu OTP reset password (gửi email)
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
 *                 description: Email của tài khoản cần reset password
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: OTP đã được gửi qua email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Email không tồn tại
 */
authRouter.post("/forgot-password", authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password với OTP 6 số
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
 *                 description: Email của tài khoản
 *               otp:
 *                 type: string
 *                 description: Mã OTP 6 số từ email
 *               newPassword:
 *                 type: string
 *                 description: Mật khẩu mới
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *     responses:
 *       200:
 *         description: Reset password thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: OTP không hợp lệ hoặc đã hết hạn
 */
authRouter.post("/reset-password", authController.resetPassword);

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
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


// Sau khi người dùng chọn tài khoản gmail và đồng ý với bên google
// Passport sẽ lấy code và xử lý với bên google => lấy thông tin gmail => kích hoạt hàm verify ở trong src/common/passport/login-google.passport.js
authRouter.get("/google-callback", passport.authenticate('google', { failureRedirect: '/login', session: false }), authController.googleCallback);
export default authRouter;