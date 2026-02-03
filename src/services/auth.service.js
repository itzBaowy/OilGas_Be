import prisma from '../prisma/connect.prisma.js';
import bcrypt from 'bcryptjs';
import { tokenService } from './token.service.js';
import { BadRequestException, UnauthorizedException } from "../common/helpers/exception.helper.js";
import { getTokenFromHeader } from '../common/helpers/function.helper.js';
import { emailService } from './email.service.js';
import { validatePassword, validateEmail } from '../common/helpers/validate.helper.js';
import { UAParser } from 'ua-parser-js';
import requestIp from 'request-ip';
import geoip from 'geoip-lite';
import dotenv from 'dotenv';
import { getUserDeviceMap } from '../common/socket/init.socket.js';
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
    const { email, password, deviceId } = req.body;

    // Validate deviceId bắt buộc
    if (!deviceId) {
      throw new BadRequestException('Device ID is required');
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) throw new BadRequestException('No existed user with this email');

    // Compare Password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) throw new BadRequestException('Wrong password');

    // Kiểm tra xem có device nào đang online không
    const userDeviceMap = getUserDeviceMap();
    const existingDevice = userDeviceMap.get(user.id);

    // Nếu có device đang online và deviceId khác nhau → yêu cầu OTP
    if (existingDevice && existingDevice.deviceId !== deviceId) {
      const otp = emailService.generateOtp();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

      // Lưu OTP vào database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: otp,
          resetPasswordExpires: otpExpires,
        },
      });

      await emailService.sendOtpEmail(email, otp);

      // Trả về yêu cầu OTP
      return {
        requireOtp: true,
        message: 'OTP has been sent to your email. Please verify to login from new device.',
        email,
        deviceId
      };
    }

    // Không cần OTP → login bình thường
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

  async verifyDeviceOtp(req) {
    const { email, deviceId, otp } = req.body;

    if (!email || !deviceId || !otp) {
      throw new BadRequestException('Email, deviceId and OTP are required');
    }

    // Tìm user với email và OTP
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        resetPasswordToken: otp,
      },
      include: { role: true }
    });

    if (!user) {
      throw new BadRequestException('Invalid OTP or email');
    }

    // Kiểm tra OTP hết hạn
    if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) {
      // Xóa OTP hết hạn
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });
      throw new BadRequestException('OTP expired');
    }

    // OTP đúng → xóa OTP khỏi database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

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

    // Tạo tokens
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

    // Tạo OTP 6 số
    const otp = emailService.generateOtp();

    // OTP có hiệu lực trong 5 phút
    const resetPasswordExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Lưu OTP vào database
    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: otp, // Lưu OTP trực tiếp (hoặc có thể hash nếu muốn bảo mật hơn)
        resetPasswordExpires: resetPasswordExpires,
      },
    });

    // Gửi email với OTP
    await emailService.sendResetPasswordEmail(email, otp);

    return { message: 'OTP has been sent to your email' };
  },

  // Reset Password - Verify OTP và đổi password
  async resetPassword(req) {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new BadRequestException('Email, OTP and new password are required');
    }

    // Validate email
    validateEmail(email);
    // Validate new password
    validatePassword(newPassword);

    // Tìm user với email và OTP
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        resetPasswordToken: otp,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid OTP');
    }

    // Kiểm tra OTP đã hết hạn chưa
    if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
      // OTP đã hết hạn → Xóa OTP và throw error
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    // Kiểm tra mật khẩu mới không trùng với mật khẩu cũ
    // const isSamePassword = bcrypt.compareSync(newPassword, user.password);
    // if (isSamePassword) {
    //   throw new BadRequestException('New password must be different from old password');
    // }

    // Hash password mới
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Cập nhật password và xóa OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
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