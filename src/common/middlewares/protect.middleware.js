import { tokenService } from "../../services/token.service.js";
import { UnauthorizedException } from "../helpers/exception.helper.js";
import prisma from "../../prisma/connect.prisma.js";
import { sessionService } from "../../services/session.service.js";
import { authService } from "../../services/auth.service.js";

export const protect = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        throw new UnauthorizedException("No authorization");
    }

    const [type, token] = authorization.split(" ");
    if (type !== "Bearer") {
        throw new UnauthorizedException("Token is not Bearer");
    }
    if (!token) {
        throw new UnauthorizedException("No token");
    }

    // Kiểm tra token có trong blacklist không
    const blacklistedToken = await prisma.blackListToken.findFirst({
        where: {
            token: token,
        },
    });
    if (blacklistedToken) {
        throw new UnauthorizedException("Token has been revoked");
    }

    const { userId } = tokenService.verifyAccessToken(token);

    const userExits = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        include: {
            role: true,
        },
    });
    if (!userExits) {
        throw new UnauthorizedException("Cannot find user");
    }

    // Check if user account is active
    if (!userExits.isActive || userExits.status === 'INACTIVE') {
        throw new UnauthorizedException("Your account has been deactivated. Please contact the administrator.");
    }

    // Check Redis session (activity-based timeout)
    const isSessionValid = await sessionService.isSessionValid(userId);
    if (!isSessionValid) {
        // Logout user (blacklist token + delete Redis session)
        await authService.logout({
            headers: { authorization },
            user: { id: userId }
        });
        throw new UnauthorizedException("Session expired due to inactivity. Please login again.");
    }

    // Refresh session TTL (reset timeout on activity)
    await sessionService.refreshSession(userId);

    // console.log({ authorization, type, token, userId, userExits });

    req.user = userExits

    next();
};
