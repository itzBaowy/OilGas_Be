import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET;

export const tokenService = {
    createTokens(userId) {
        const accessToken = jsonwebtoken.sign({ userId: userId }, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
        const refreshToken = jsonwebtoken.sign({ userId: userId }, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

        return {
            accessToken: accessToken,
            refreshToken: refreshToken,
        };
    },
    createResetToken(userId, email) {
        const resetToken = jsonwebtoken.sign({ userId: userId, email: email }, RESET_TOKEN_SECRET, { expiresIn: '15m' });
        return resetToken;
    },

    verifyAccessToken(accessToken, option) {
        const decode = jsonwebtoken.verify(accessToken, ACCESS_TOKEN_SECRET, option);
        return decode;
    },

    verifyRefreshToken(refreshToken) {
        const decode = jsonwebtoken.verify(refreshToken, REFRESH_TOKEN_SECRET);
        return decode;
    },
    verifyResetToken(resetToken) {
        const decode = jsonwebtoken.verify(resetToken, RESET_TOKEN_SECRET);
        return decode;
    }
};
