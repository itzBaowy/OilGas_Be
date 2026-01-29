import prisma from "../prisma/connect.prisma.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";
import { BadRequestException, NotFoundException } from "../common/helpers/exception.helper.js";

export const roleService = {
    // Lấy tất cả roles với phân trang
    async getAllRoles(req) {
        const { page, pageSize, where, index } = buildQueryPrisma(req.query);

        const resultPrismaPromise = prisma.role.findMany({
            where: where,
            skip: index,
            take: pageSize,
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        const totalItemPromise = prisma.role.count({
            where: where,
        });

        const [resultPrisma, totalItem] = await Promise.all([resultPrismaPromise, totalItemPromise]);

        return {
            page: page,
            pageSize: pageSize,
            totalItem: totalItem,
            totalPage: Math.ceil(totalItem / pageSize),
            items: resultPrisma,
        };
    },

    // Lấy role theo ID
    async getRoleById(roleId) {
        const role = await prisma.role.findUnique({
            where: { id: roleId },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!role) {
            throw new NotFoundException("Role không tồn tại");
        }

        return role;
    },

    // Tạo role mới
    async createRole(data) {
        const { name, description, permissions } = data;

        // Kiểm tra role đã tồn tại chưa
        const existingRole = await prisma.role.findUnique({
            where: { name }
        });

        if (existingRole) {
            throw new BadRequestException("Role đã tồn tại");
        }

        // Validate permissions nếu cần
        if (permissions && !Array.isArray(permissions)) {
            throw new BadRequestException("Permissions phải là array");
        }

        const role = await prisma.role.create({
            data: {
                name,
                description,
                permissions: permissions || []
            }
        });

        return role;
    },

    // Cập nhật role
    async updateRole(roleId, data) {
        const { name, description, permissions } = data;

        // Kiểm tra role có tồn tại không
        const existingRole = await prisma.role.findUnique({
            where: { id: roleId }
        });

        if (!existingRole) {
            throw new NotFoundException("Role không tồn tại");
        }

        // Nếu đổi tên, kiểm tra tên mới đã tồn tại chưa
        if (name && name !== existingRole.name) {
            const duplicateName = await prisma.role.findUnique({
                where: { name }
            });

            if (duplicateName) {
                throw new BadRequestException("Tên role đã tồn tại");
            }
        }

        // Validate permissions nếu có
        if (permissions && !Array.isArray(permissions)) {
            throw new BadRequestException("Permissions phải là array");
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (permissions) updateData.permissions = permissions;

        const role = await prisma.role.update({
            where: { id: roleId },
            data: updateData
        });

        return role;
    },

    // Xóa role
    async deleteRole(roleId) {
        // Kiểm tra role có tồn tại không
        const existingRole = await prisma.role.findUnique({
            where: { id: roleId },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!existingRole) {
            throw new NotFoundException("Role không tồn tại");
        }

        // Kiểm tra xem role có user nào đang dùng không
        if (existingRole._count.users > 0) {
            throw new BadRequestException(
                `Không thể xóa role này vì còn ${existingRole._count.users} user đang sử dụng`
            );
        }

        await prisma.role.delete({
            where: { id: roleId }
        });

        return { message: "Xóa role thành công" };
    },

    // Thêm permission vào role
    async addPermission(roleId, permission) {
        const role = await prisma.role.findUnique({
            where: { id: roleId }
        });

        if (!role) {
            throw new NotFoundException("Role không tồn tại");
        }

        // Kiểm tra permission đã tồn tại chưa
        if (role.permissions.includes(permission)) {
            throw new BadRequestException("Permission đã tồn tại trong role");
        }

        const updatedRole = await prisma.role.update({
            where: { id: roleId },
            data: {
                permissions: {
                    push: permission
                }
            }
        });

        return updatedRole;
    },

    // Xóa permission khỏi role
    async removePermission(roleId, permission) {
        const role = await prisma.role.findUnique({
            where: { id: roleId }
        });

        if (!role) {
            throw new NotFoundException("Role không tồn tại");
        }

        // Kiểm tra permission có tồn tại không
        if (!role.permissions.includes(permission)) {
            throw new BadRequestException("Permission không tồn tại trong role");
        }

        const updatedPermissions = role.permissions.filter(p => p !== permission);

        const updatedRole = await prisma.role.update({
            where: { id: roleId },
            data: {
                permissions: updatedPermissions
            }
        });

        return updatedRole;
    },

    // Cập nhật toàn bộ permissions của role
    async updatePermissions(roleId, permissions) {
        const role = await prisma.role.findUnique({
            where: { id: roleId }
        });

        if (!role) {
            throw new NotFoundException("Role không tồn tại");
        }

        if (!Array.isArray(permissions)) {
            throw new BadRequestException("Permissions phải là array");
        }

        const updatedRole = await prisma.role.update({
            where: { id: roleId },
            data: {
                permissions: permissions
            }
        });

        return updatedRole;
    }
};
