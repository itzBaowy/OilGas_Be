import prisma from '../prisma/connect.prisma.js';
import bcrypt from 'bcryptjs';
import { tokenService } from './token.service.js';
import { BadRequestException, UnauthorizedException } from "../common/helpers/exception.helper.js";
import { getTokenFromHeader } from '../common/helpers/function.helper.js';
import { emailService } from './email.service.js';
import { validatePassword, validateEmail } from '../common/helpers/validate.helper.js';
import { UAParser } from 'ua-parser-js';
import jsonwebtoken from 'jsonwebtoken';
import requestIp from 'request-ip';
import geoip from 'geoip-lite';
import dotenv from 'dotenv';
dotenv.config();
const FRONTEND_URL = process.env.FRONTEND_URL;

export const authService = {
  async register(req) {
    const { fullName, email, password, phoneNumber, roleId } = req.body;
    // Validate email
    validateEmail(email);
    // Validate password
    validatePassword(password);

    // check duplicate email
    const existUser = await prisma.user.findUnique({ where: { email } });
    if (existUser) throw new BadRequestException('Email existed');

    // assign role
    let assignedRoleId = roleId;
    if (!assignedRoleId) {
      const defaultRole = await prisma.role.findUnique({ where: { name: 'Engineer' } });
      if (!defaultRole) throw new BadRequestException('No Engineer Role found');
      assignedRoleId = defaultRole.id;
    }

    // Hash Password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create User
    return await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phoneNumber,
        roleId: assignedRoleId,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
      include: { role: true }
    });
  },

  async login(req) {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) throw new BadRequestException('No existed user with this email');

    // Compare Password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) throw new BadRequestException('Wrong password');
    // Lưu lịch sử đăng nhập
    const clientIp = requestIp.getClientIp(req) || '127.0.0.1';

    const geo = geoip.lookup(clientIp);
    const location = geo ? `${geo.city}, ${geo.country}` : 'Unknown Location';

    const userAgent = req.headers['user-agent'];
    const parser = new UAParser(userAgent);
    const deviceName = `${parser.getBrowser().name} on ${parser.getOS().name}`;

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip: clientIp,
        location: location,
        device: deviceName,
        browser: parser.getBrowser().name,
        os: parser.getOS().name
      }
    });
    // tạo token
    const tokens = tokenService.createTokens(user.id);

    return tokens;
  },

  async getInfo(req) {
    delete req.user.password;

    return req.user;
  },


  async refreshToken(req) {
    // Lấy accessToken từ header Authorization
    const accessToken = getTokenFromHeader(req);
    // Lấy refreshToken từ body
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new BadRequestException("Refresh Token required");
    }

    // accessToken: đang bị hết hạn
    // verify accessToken phải loại trừ hết hạn
    const decodeAccessToken = tokenService.verifyAccessToken(accessToken, { ignoreExpiration: true });
    const decodeRefreshToken = tokenService.verifyRefreshToken(refreshToken);

    if (decodeAccessToken.userId !== decodeRefreshToken.userId) {
      throw new UnauthorizedException("Invalid Refresh Token");
    }

    const userExist = await prisma.user.findUnique({
      where: {
        id: decodeRefreshToken.userId,
      },
    });
    if (!userExist) {
      throw new UnauthorizedException("No existed user");
    }

    // Trường hợp: trả 2 token
    // refreshToken (1d) sẽ được làm mới (rotate): chỉ cần trong 1 ngày mà người dùng không đăng nhập => logout
    const tokens = tokenService.createTokens(userExist.id)

    // Trường hợp: trả 1 token (accessToken)
    // refreshToken KHÔNG được làm mới: thời gian sống bao nhiêu thì trạng thái đăng nhập giữ được bấy nhiêu

    // console.log({ accessToken, refreshToken });

    return tokens;
  },

  async changePassword(req) {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new BadRequestException('Old password and new password are required');
    }

    // Validate new password
    validatePassword(newPassword);

    if (oldPassword === newPassword) {
      throw new BadRequestException('New password must be different from old password');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = bcrypt.compareSync(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Wrong password');
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        lastPasswordChangeAt: new Date() // lưu thời gian đổi mật khẩu
      },
    });

    delete updatedUser.password;

    return updatedUser;
  },

  async googleCallback(req) {
    // console.log("user google", req.user);

    const { accessToken, refreshToken } = tokenService.createTokens(req.user.id);
    // console.log({ accessToken, refreshToken });

    // truyền AT và RT trong query url của FE
    // FE dùng hook  useSearchParams(); để lấy AT và RT
    const urlRedirect = `${FRONTEND_URL}/login-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
    return urlRedirect;
  },
  // Forgot Password - Gửi OTP qua email
  async forgotPassword(req) {
  const { email } = req.body;

  // Validate email
  validateEmail(email);

  // Kiểm tra user có tồn tại không
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new BadRequestException('No user found with this email');
  }

  // Tạo reset token (JWT)
  const resetToken = tokenService.createResetToken(user.id);

  // Lưu token vào database
  const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
  
  await prisma.user.update({
    where: { email },
    data: {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetPasswordExpires,
    },
  });

  // Tạo reset link
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  // Gửi email với reset link
  await emailService.sendResetPasswordEmail(email, resetLink);

  return { message: 'Password reset link has been sent to your email' };
},

// Reset Password - Verify token và đổi password
async resetPassword(req) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new BadRequestException('Token and new password are required');
  }

  // Validate new password
  validatePassword(newPassword);

  // Verify token
  let decoded;
  try {
    decoded = jsonwebtoken.verify(
      token,
      process.env.RESET_PASSWORD_SECRET || process.env.ACCESS_TOKEN_SECRET
    );
  } catch (error) {
    if (error instanceof jsonwebtoken.TokenExpiredError) {
      throw new BadRequestException('Reset link has expired. Please request a new one');
    }
    throw new BadRequestException('Invalid reset link');
  }

  // Tìm user với token
  const user = await prisma.user.findFirst({
    where: {
      id: decoded.userId,
      email: decoded.email,
      resetPasswordToken: token,
    },
  });

  if (!user) {
    throw new BadRequestException('Invalid reset link');
  }

  // Kiểm tra token đã hết hạn chưa
  if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
    // Token đã hết hạn → Xóa token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    throw new BadRequestException('Reset link has expired. Please request a new one');
  }

  // Hash password mới
  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  // Cập nhật password và xóa reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      lastPasswordChangeAt: new Date(),
    },
  });

  return { message: 'Password has been reset successfully' };
},

  async getLoginHistory(req) {
    const userId = req.user.id;
    return await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: 10 // lấy 10 lần đăng nhập gần nhất
    });
  },

  async logout(req) {
    // Lấy token từ header Authorization
    const accessToken = getTokenFromHeader(req);

    // Lưu token vào blacklist
    await prisma.blackListToken.create({
      data: {
        token: accessToken,
      },
    });

    return { message: 'Logout successfully' };
  },

};