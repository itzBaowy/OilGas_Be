import { statusCodes } from "./status-code.helper.js";


export class BadRequestException extends Error {
    constructor(message = `BadRequestException`) {
        super(message);
        this.code = statusCodes.BAD_REQUEST;
    }
}

/**
 * 401: yêu cầu FE logout
 * 9001: nội bộ
 */
export class UnauthorizedException extends Error {
    constructor(message = `UnauthorizedException`) {
        super(message);
        this.code = statusCodes.UNAUTHORIZED;
    }
}
/**
 * 403: FE yêu cầu làm mới accessToken
 * 9003: nội bộ
 */
export class ForbiddenException extends Error {
    constructor(message = `ForbiddenException`) {
        super(message);
        this.code = statusCodes.FORBIDDEN;
    }
}

/**
 * 404: không tìm thấy ....
 */
export class NotFoundException extends Error {
    constructor(message = `NotFoundException`) {
        super(message);
        this.code = statusCodes.NOT_FOUND;
    }
}
