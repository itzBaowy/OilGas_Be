import { UnauthorizedException } from "./exception.helper.js";
export function responseSuccess(data, message = "ok", statusCode = 200) {
    return {
        status: "success",
        statusCode: statusCode,
        message: message,
        data: data,
    };
}

export function responseError(message = "Interval Server Error", statusCode = 500) {
    return {
        status: "error",
        statusCode: statusCode,
        message: message,
    };
}

export function getTokenFromHeader(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException("Invalid Access Token");
    }
    const token = authHeader.split(' ')[1];
    return token;
}
