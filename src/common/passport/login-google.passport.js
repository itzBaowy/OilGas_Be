import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// var GoogleStrategy = require("passport-google-oauth20").Strategy;
import passport from "passport";
import { BadRequestException } from "../helpers/exception.helper.js";
import prisma from "../../prisma/connect.prisma.js";

const BACKEND_URL = process.env.BACKEND_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRECT = process.env.GOOGLE_CLIENT_SECRET;

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

                if (!isVerified) {
                    // thất bại cb(error,null)
                    cb(new BadRequestException("Email isVerified=false"), null);
                    return;
                }

                const userExist = await prisma.user.findUnique({
                    where: {
                        email: email,
                    },
                    include: { role: true },
                });

                // Web nội bộ: Chỉ cho phép login nếu email đã tồn tại trong hệ thống
                // Admin phải tạo user trước, sau đó user mới có thể login bằng Google
                if (!userExist) {
                    cb(new BadRequestException("Your email is not registered in the system. Please contact administrator."), null);
                    return;
                }

                // Nếu user tồn tại → Cho phép đăng nhập
                // thành công cb(null, user);
                cb(null, userExist);
            }
        )
    );
};
