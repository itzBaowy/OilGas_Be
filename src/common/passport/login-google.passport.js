import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// var GoogleStrategy = require("passport-google-oauth20").Strategy;
import passport from "passport";
import { BadRequestException } from "../helpers/exception.helper.js";
import prisma from "../../prisma/connect.prisma.js";

const BACKEND_URL = process.env.BACKEND_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRECT = process.env.GOOGLE_CLIENT_SECRET;
const DEFAULT_ROLE_NAME = 'Engineer';
/**
 * phải chạy trước mọi api xử lý về login google
 */
export const initGoogleStrategy = () => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRECT,
                callbackURL: `${BACKEND_URL}/api/auth/google-callback`,
            },
            async function (accessToken, refreshToken, profile, cb) {

                const email = profile.emails[0].value;
                const isVerified = profile.emails[0].verified;
                const fullName = profile.displayName;
                const googleId = profile.id;
                const avatar = profile.photos[0].value;

                if (!isVerified) {
                    // thất bại cb(error,null)
                    cb(new BadRequestException("Email isVerified=false"), null);
                    return;
                }

                const userExist = await prisma.user.findUnique({
                    where: {
                        email: email,
                    },
                });

                // assign role
                const defaultRole = await prisma.role.findUnique({ where: { name: DEFAULT_ROLE_NAME } });
                if (!defaultRole) throw new BadRequestException(`No ${DEFAULT_ROLE_NAME} Role found`);

                // Nếu mà không có tài khoản thì tạo mới
                // Sẽ luôn luôn cho người dùng đăng nhập
                // Vì bên phía Google đã hỗ trợ xác thực
                if (!userExist) {
                    await prisma.user.create({
                        data: {
                            email: email,
                            googleId: googleId,
                            avatar: avatar,
                            fullName: fullName,
                            roleId: defaultRole.id,
                        },
                        include: { role: true },
                    });
                }

                // nếu mà code chạy được tới đây thì sẽ đảm bảo userExist luôn có dữ liệu
                // thành công cb(null, user);
                cb(null, userExist);
            }
        )
    );
};
