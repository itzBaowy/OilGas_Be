import prisma from '../prisma/connect.prisma.js';
import bcrypt from 'bcryptjs';
import { tokenService } from './token.service.js';
import { BadRequestException, UnauthorizedException } from "../common/helpers/exception.helper.js";


export const authService = {
  async register(req) {
    const { fullName, email, password, phoneNumber, roleId } = req.body;
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
        roleId: assignedRoleId
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
    const tokens = tokenService.createTokens(user.id);

    return tokens;
  },

  async getInfo(req) {
    delete req.user.password;

    return req.user;
  },


  async refreshToken(req) {
    // Lấy accessToken từ header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException("Invalid Access Token");
    }
    const accessToken = authHeader.split(' ')[1];
    
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
};