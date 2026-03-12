import prisma from "../prisma/connect.prisma.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";
import { BadRequestException, NotFoundException } from "../common/helpers/exception.helper.js";

export const warehouseService = {
    // Generate custom warehouse ID (WH-001, WH-002, etc.)
    async generateCustomId() {
        try {
            const updatedSequence = await prisma.sequence.upsert({
                where: { name: "warehouse" },
                update: { value: { increment: 1 } },
                create: { name: "warehouse", value: 1 }
            });

            const nextValue = updatedSequence.value;
            return `WH-${String(nextValue).padStart(3, '0')}`;
        } catch (error) {
            throw new Error(`Failed to generate custom warehouse ID: ${error.message}`);
        }
    },
    // Lấy tất cả warehouses với phân trang
    async getAllWarehouses(req) {
        const { page, pageSize, where, index } = buildQueryPrisma(req.query);

        const resultPrismaPromise = prisma.warehouse.findMany({
            where: where,
            skip: index,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            include: {
                inventories: {
                    select: { quantity: true }
                }
            }
        });

        const totalItemPromise = prisma.warehouse.count({
            where: where,
        });

        const [resultPrisma, totalItem] = await Promise.all([resultPrismaPromise, totalItemPromise]);

        const items = resultPrisma.map(({ inventories, ...warehouse }) => {
            const totalQuantity = inventories.reduce((sum, inv) => sum + inv.quantity, 0);
            const usagePercentage = warehouse.capacity > 0
                ? parseFloat(((totalQuantity / warehouse.capacity) * 100).toFixed(2))
                : 0;
            return { ...warehouse, totalQuantity, usagePercentage };
        });

        return {
            page: page,
            pageSize: pageSize,
            totalItem: totalItem,
            totalPage: Math.ceil(totalItem / pageSize),
            items,
        };
    },

    // Lấy warehouse theo ID
    async getWarehouseById(warehouseId) {
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId },
            include: {
                inventories: {
                    select: { quantity: true }
                }
            }
        });

        if (!warehouse) {
            throw new NotFoundException("Warehouse không tồn tại");
        }

        const { inventories, ...warehouseData } = warehouse;
        const totalQuantity = inventories.reduce((sum, inv) => sum + inv.quantity, 0);
        const usagePercentage = warehouseData.capacity > 0
            ? parseFloat(((totalQuantity / warehouseData.capacity) * 100).toFixed(2))
            : 0;

        return { ...warehouseData, totalQuantity, usagePercentage };
    },

    // Tạo warehouse mới
    async createWarehouse(data, userId) {
        const { name, location, capacity, oilCapacity, description, status, coordinate } = data;

        if (!name || !location || capacity === undefined) {
            throw new BadRequestException("Name, location, and capacity are required");
        }

        if (capacity <= 0) {
            throw new BadRequestException("Capacity must be greater than 0");
        }

        const validStatuses = ['ACTIVE', 'MAINTENANCE'];
        if (status && !validStatuses.includes(status)) {
            throw new BadRequestException("Status must be ACTIVE or MAINTENANCE");
        }

        const existingWarehouse = await prisma.warehouse.findFirst({
            where: {
                name: name,
                location: location
            }
        });

        if (existingWarehouse) {
            throw new BadRequestException("Warehouse with this name and location already exists");
        }

        const warehouseId = await this.generateCustomId();

        const warehouse = await prisma.warehouse.create({
            data: {
                warehouseId,
                name,
                location,
                capacity: parseInt(capacity),
                oilCapacity: oilCapacity ? parseFloat(oilCapacity) : 50000,
                currentOilVolume: 0,
                description: description || null,
                status: status || 'ACTIVE',
                coordinate: coordinate || null,
                createdBy: userId || null
            }
        });

        return warehouse;
    },

    // Cập nhật warehouse
    async updateWarehouse(warehouseId, data, userId) {
        const { name, location, capacity, oilCapacity, description, status, coordinate } = data;

        const existingWarehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId }
        });

        if (!existingWarehouse) {
            throw new NotFoundException("Warehouse does not exist");
        }

        if (capacity !== undefined && capacity <= 0) {
            throw new BadRequestException("Capacity must be greater than 0");
        }

        const validStatuses = ['ACTIVE', 'MAINTENANCE'];
        if (status && !validStatuses.includes(status)) {
            throw new BadRequestException("Status must be ACTIVE or MAINTENANCE");
        }

        if ((name && name !== existingWarehouse.name) || (location && location !== existingWarehouse.location)) {
            const duplicateWarehouse = await prisma.warehouse.findFirst({
                where: {
                    name: name || existingWarehouse.name,
                    location: location || existingWarehouse.location,
                    id: { not: warehouseId }
                }
            });

            if (duplicateWarehouse) {
                throw new BadRequestException("Warehouse with this name and location already exists");
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (location !== undefined) updateData.location = location;
        if (capacity !== undefined) updateData.capacity = parseInt(capacity);
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (oilCapacity !== undefined) updateData.oilCapacity = parseFloat(oilCapacity);
        if (coordinate !== undefined) updateData.coordinate = coordinate;

        const warehouse = await prisma.warehouse.update({
            where: { id: warehouseId },
            data: updateData
        });

        return warehouse;
    },

    // Xóa warehouse
    async deleteWarehouse(warehouseId) {
        // Kiểm tra warehouse có tồn tại không
        const existingWarehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId }
        });

        if (!existingWarehouse) {
            throw new NotFoundException("Warehouse does not exist");
        }

        // Check if warehouse has any inventory before deleting
        const inventoryCount = await prisma.inventory.count({
            where: { warehouseId: warehouseId }
        });

        if (inventoryCount > 0) {
            throw new BadRequestException(
                `Cannot delete warehouse. It still contains ${inventoryCount} inventory item(s). Please move or remove all inventory before deleting the warehouse.`
            );
        }

        await prisma.warehouse.delete({
            where: { id: warehouseId }
        });

        return { message: "Warehouse deleted successfully" };
    },

    // Cập nhật status warehouse
    async updateWarehouseStatus(warehouseId, status) {
        // Validate status
        const validStatuses = ['ACTIVE', 'MAINTENANCE'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException("Status must be ACTIVE or MAINTENANCE");
        }

        // Kiểm tra warehouse có tồn tại không
        const existingWarehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId }
        });

        if (!existingWarehouse) {
            throw new NotFoundException("Warehouse does not exist");
        }

        const warehouse = await prisma.warehouse.update({
            where: { id: warehouseId },
            data: { status }
        });

        return warehouse;
    }
};
