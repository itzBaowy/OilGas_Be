import { responseError } from "./function.helper.js";
import jwt from "jsonwebtoken";
import { statusCodes } from "./status-code.helper.js";

/**
 * Để ở cuối để gom tất cả các lỗi có trong dự án
 */
export const appErorr = (err, req, res, next) => {
    console.log(`Middleware đặc biệt, bắt lỗi`, err);

    if (err instanceof jwt.JsonWebTokenError) {
        err.code = statusCodes.UNAUTHORIZED; // 401 => FE logout người dùng
    }
    if (err instanceof jwt.TokenExpiredError) {
        err.code = statusCodes.FORBIDDEN; // 403 => FE sẽ gọi api POST: api/auth/refresh-token
    }

    // undefinde: không tồn tại
    // null: có tồn tại nhưng bị rỗng
    const response = responseError(err?.message, err.code);

    res.status(response.statusCode).json(response);
};
