import { ForbiddenException } from "../helpers/exception.helper.js";

export const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // Kiểm tra user đã được authenticate chưa (từ protect middleware)
        if (!req.user) {
            throw new ForbiddenException("User not authenticated");
        }

        // Kiểm tra user có role không
        if (!req.user.role) {
            throw new ForbiddenException("User has no role assigned");
        }

        const userRole = req.user.role.name;

        // Kiểm tra role của user có trong danh sách cho phép không
        if (!allowedRoles.includes(userRole)) {
            throw new ForbiddenException(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
        }

        next();
    };
};

export const checkPermission = (requiredPermissions) => {
    return (req, res, next) => {
        // Kiểm tra user đã được authenticate chưa
        if (!req.user) {
            throw new ForbiddenException("User not authenticated");
        }

        // Kiểm tra user có role không
        if (!req.user.role) {
            throw new ForbiddenException("User has no role assigned");
        }

        const userPermissions = req.user.role.permissions;

        // Kiểm tra user có ít nhất 1 permission trong danh sách yêu cầu
        const hasPermission = requiredPermissions.some(permission => 
            userPermissions.includes(permission)
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
            );
        }

        next();
    };
};
