import prisma from "../prisma/connect.prisma.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";
import { BadRequestException, NotFoundException } from "../common/helpers/exception.helper.js";

export const inventoryService = {
    
    // Generate custom inventory ID (INV-001, INV-002, etc.)
    async generateInventoryId() {
        try {
            const updatedSequence = await prisma.sequence.upsert({
                where: { name: "inventory" },
                update: { value: { increment: 1 } },
                create: { name: "inventory", value: 1 }
            });

            const nextValue = updatedSequence.value;
            return `INV-${String(nextValue).padStart(3, '0')}`;
        } catch (error) {
            throw new Error(`Failed to generate custom inventory ID: ${error.message}`);
        }
    },

    // Helper function to find warehouse by custom ID or ObjectId
    async findWarehouse(warehouseIdentifier) {
        let warehouse = null;

        // Check if input looks like a custom ID (WH-001, WH-002, etc.)
        if (warehouseIdentifier.match(/^WH-\d{3}$/)) {
            warehouse = await prisma.warehouse.findUnique({
                where: { warehouseId: warehouseIdentifier }
            });
        } else if (warehouseIdentifier.length === 24) {
            // If input is 24 characters, try as ObjectId
            try {
                warehouse = await prisma.warehouse.findUnique({
                    where: { id: warehouseIdentifier }
                });
            } catch (error) {
                // If ObjectId is invalid, try as custom ID anyway
                warehouse = await prisma.warehouse.findUnique({
                    where: { warehouseId: warehouseIdentifier }
                });
            }
        } else {
            // Try as custom ID for any other format
            warehouse = await prisma.warehouse.findUnique({
                where: { warehouseId: warehouseIdentifier }
            });
        }

        return warehouse;
    },

    // Helper function to find equipment by custom ID or ObjectId
    async findEquipment(equipmentIdentifier) {
        let equipment = null;

        // Check if input looks like a custom ID (EQ-001, EQ-002, etc.)
        if (equipmentIdentifier.match(/^EQ-\d{3}$/)) {
            equipment = await prisma.equipment.findUnique({
                where: { equipmentId: equipmentIdentifier }
            });
        } else if (equipmentIdentifier.length === 24) {
            // If input is 24 characters, try as ObjectId
            try {
                equipment = await prisma.equipment.findUnique({
                    where: { id: equipmentIdentifier }
                });
            } catch (error) {
                // If ObjectId is invalid, try as custom ID anyway
                equipment = await prisma.equipment.findUnique({
                    where: { equipmentId: equipmentIdentifier }
                });
            }
        } else {
            // Try as custom ID for any other format
            equipment = await prisma.equipment.findUnique({
                where: { equipmentId: equipmentIdentifier }
            });
        }

        return equipment;
    },

    // Helper function to find inventory by custom ID or ObjectId
    async findInventory(inventoryIdentifier) {
        let inventory = null;

        // Check if input looks like a custom ID (INV-001, INV-002, etc.)
        if (inventoryIdentifier.match(/^INV-\d{3}$/)) {
            inventory = await prisma.inventory.findUnique({
                where: { inventoryId: inventoryIdentifier }
            });
        } else if (inventoryIdentifier.length === 24) {
            // If input is 24 characters, try as ObjectId
            try {
                inventory = await prisma.inventory.findUnique({
                    where: { id: inventoryIdentifier }
                });
            } catch (error) {
                // If ObjectId is invalid, try as custom ID anyway
                inventory = await prisma.inventory.findUnique({
                    where: { inventoryId: inventoryIdentifier }
                });
            }
        } else {
            // Try as custom ID for any other format
            inventory = await prisma.inventory.findUnique({
                where: { inventoryId: inventoryIdentifier }
            });
        }

        return inventory;
    },

    // Helper function to calculate stock status based on quantity
    // >100 = IN_STOCK, 10-99 = LOW, <10 = OUT_OF_STOCK
    calculateStockStatus(quantity) {
        if (quantity >= 100) {
            return "IN_STOCK";
        } else if (quantity >= 10) {
            return "LOW";
        } else {
            return "OUT_OF_STOCK";
        }
    },

    // Receive Inventory (Inbound)
    async receiveInventory(data, userId) {
        const {
            warehouse_id,
            equipment_id,
            quantity,
            supplier_name,
            date_received,
            notes
        } = data;

        // Validate required fields
        if (!warehouse_id || !equipment_id || !quantity || !supplier_name || !date_received) {
            throw new BadRequestException("warehouse_id, equipment_id, quantity, supplier_name, and date_received are required");
        }

        // Validate quantity > 0
        if (quantity <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }

        // Validate warehouse exists (accept both ObjectId and custom warehouseId like WH-001)
        const warehouse = await this.findWarehouse(warehouse_id);

        if (!warehouse) {
            throw new NotFoundException("Warehouse does not exist");
        }

        // Validate equipment (SKU) exists (accept both ObjectId and custom equipmentId like EQ-001)
        const equipment = await this.findEquipment(equipment_id);

        if (!equipment) {
            throw new NotFoundException("Equipment (SKU) does not exist");
        }

        // Check if inventory record exists for this warehouse + equipment
        // Use actual ObjectId from found records
        let inventory = await prisma.inventory.findUnique({
            where: {
                warehouseId_equipmentId: {
                    warehouseId: warehouse.id,
                    equipmentId: equipment.id
                }
            }
        });

        // Calculate new quantity
        const currentQuantity = inventory ? inventory.quantity : 0;
        const newQuantity = currentQuantity + quantity;

        // Check warehouse capacity (optional enhancement)
        // For now, we'll just update the inventory

        // Calculate stock status
        const stockStatus = this.calculateStockStatus(newQuantity);

        // Create or update inventory
        if (inventory) {
            // Update existing inventory
            inventory = await prisma.inventory.update({
                where: { id: inventory.id },
                data: {
                    quantity: newQuantity,
                    stockStatus: stockStatus
                }
            });
        } else {
            // Generate custom inventory ID for new inventory
            const inventoryId = await this.generateInventoryId();
            
            // Create new inventory record
            inventory = await prisma.inventory.create({
                data: {
                    inventoryId: inventoryId,
                    warehouseId: warehouse.id,
                    equipmentId: equipment.id,
                    quantity: newQuantity,
                    stockStatus: stockStatus
                }
            });
        }

        // Log transaction in inventory ledger
        const ledger = await prisma.inventoryLedger.create({
            data: {
                inventoryId: inventory.id,
                movementType: "RECEIVE",
                quantity: quantity,
                supplierName: supplier_name,
                receiverId: userId,
                notes: notes || null,
                dateReceived: new Date(date_received)
            }
        });

        return {
            inventory,
            ledger,
            message: "Inventory received successfully"
        };
    },

    // Dispatch Inventory (Outbound)
    async dispatchInventory(data, userId) {
        const {
            warehouse_id,
            equipment_id,
            quantity,
            destination,
            date_dispatched,
            notes
        } = data;

        // Validate required fields
        if (!warehouse_id || !equipment_id || !quantity || !destination || !date_dispatched) {
            throw new BadRequestException("warehouse_id, equipment_id, quantity, destination, and date_dispatched are required");
        }

        // Validate quantity > 0
        if (quantity <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }

        // Validate warehouse exists (accept both ObjectId and custom warehouseId like WH-001)
        const warehouse = await this.findWarehouse(warehouse_id);

        if (!warehouse) {
            throw new NotFoundException("Warehouse does not exist");
        }

        // Validate equipment (SKU) exists (accept both ObjectId and custom equipmentId like EQ-001)
        const equipment = await this.findEquipment(equipment_id);

        if (!equipment) {
            throw new NotFoundException("Equipment (SKU) does not exist");
        }

        // Check if inventory exists (use actual ObjectIds)
        const inventory = await prisma.inventory.findUnique({
            where: {
                warehouseId_equipmentId: {
                    warehouseId: warehouse.id,
                    equipmentId: equipment.id
                }
            }
        });

        if (!inventory) {
            throw new NotFoundException("Inventory not found for this warehouse and equipment");
        }

        // Check stock availability
        if (inventory.quantity < quantity) {
            throw new BadRequestException(`Insufficient stock. Available: ${inventory.quantity}, Requested: ${quantity}`);
        }

        // Calculate new quantity
        const newQuantity = inventory.quantity - quantity;

        // Calculate stock status
        const stockStatus = this.calculateStockStatus(newQuantity);

        // Update inventory
        const updatedInventory = await prisma.inventory.update({
            where: { id: inventory.id },
            data: {
                quantity: newQuantity,
                stockStatus: stockStatus
            }
        });

        // Log transaction in inventory ledger
        const ledger = await prisma.inventoryLedger.create({
            data: {
                inventoryId: inventory.id,
                movementType: "DISPATCH",
                quantity: quantity,
                destination: destination,
                receiverId: userId,
                notes: notes || null,
                dateDispatched: new Date(date_dispatched)
            }
        });

        // Trigger low stock alert if needed
        let alert = null;
        if (stockStatus === "LOW" || stockStatus === "OUT_OF_STOCK") {
            alert = {
                message: `Low stock alert for ${equipment.name} in ${warehouse.name}`,
                stockStatus: stockStatus,
                currentQuantity: newQuantity
            };
        }

        return {
            inventory: updatedInventory,
            ledger,
            alert,
            message: "Inventory dispatched successfully"
        };
    },

    // Get all inventory with filters (Inventory Report / View Inventory)
    async getAllInventory(req) {
        const { page, pageSize, where, index } = buildQueryPrisma(req.query);

        // Build custom filters from query params
        const filters = { ...where };

        // Filter by warehouse (support both ObjectId and custom warehouseId like WH-001)
        if (req.query.warehouse_id) {
            const warehouse = await this.findWarehouse(req.query.warehouse_id);
            if (warehouse) {
                filters.warehouseId = warehouse.id; // Use ObjectId for query
            } else {
                // If warehouse not found, return empty result
                return {
                    page: page,
                    pageSize: pageSize,
                    totalItem: 0,
                    totalPage: 0,
                    items: [],
                };
            }
        }

        // Filter by item type (equipment type)
        if (req.query.item_type) {
            filters.equipment = {
                type: req.query.item_type
            };
        }

        // Filter by SKU (equipment_id or equipmentId)
        if (req.query.sku) {
            filters.equipment = {
                ...filters.equipment,
                equipmentId: {
                    contains: req.query.sku,
                    mode: 'insensitive'
                }
            };
        }

        // Filter by quantity range
        if (req.query.quantity_min || req.query.quantity_max) {
            filters.quantity = {};
            if (req.query.quantity_min) {
                filters.quantity.gte = parseInt(req.query.quantity_min);
            }
            if (req.query.quantity_max) {
                filters.quantity.lte = parseInt(req.query.quantity_max);
            }
        }

        // Filter by stock status
        if (req.query.stock_status) {
            filters.stockStatus = req.query.stock_status;
        }

        const resultPrismaPromise = prisma.inventory.findMany({
            where: filters,
            skip: index,
            take: pageSize,
            orderBy: { lastUpdated: 'desc' },
            include: {
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        capacity: true,
                        status: true
                    }
                },
                equipment: {
                    select: {
                        id: true,
                        equipmentId: true,
                        name: true,
                        type: true,
                        serialNumber: true,
                        manufacturer: true
                    }
                }
            }
        });

        const totalItemPromise = prisma.inventory.count({
            where: filters,
        });

        const [resultPrisma, totalItem] = await Promise.all([resultPrismaPromise, totalItemPromise]);

        // Format response with additional fields
        const items = resultPrisma.map(item => ({
            id: item.id,
            inventory_custom_id: item.inventoryId, // Custom ID: INV-001
            equipment_id: item.equipmentId,
            item_name: item.equipment.name,
            category: item.equipment.type,
            sku: item.equipment.equipmentId,
            quantity_available: item.quantity,
            warehouse_location: `${item.warehouse.name} - ${item.warehouse.location}`,
            warehouse_id: item.warehouseId,
            warehouse_custom_id: item.warehouse.warehouseId, // Custom ID: WH-001
            warehouse_name: item.warehouse.name,
            equipment_custom_id: item.equipment.equipmentId, // Custom ID: EQ-001
            stock_status: item.stockStatus,
            last_updated: item.lastUpdated
        }));

        return {
            page: page,
            pageSize: pageSize,
            totalItem: totalItem,
            totalPage: Math.ceil(totalItem / pageSize),
            items: items,
        };
    },

    // Get inventory by ID (support both ObjectId and custom inventoryId)
    async getInventoryById(inventoryId) {
        // Use helper to find by either ObjectId or custom ID (INV-001)
        const inventory = await this.findInventory(inventoryId);

        if (!inventory) {
            throw new NotFoundException("Inventory not found");
        }

        // Fetch full details with relations
        const inventoryDetails = await prisma.inventory.findUnique({
            where: { id: inventory.id },
            include: {
                warehouse: {
                    select: {
                        id: true,
                        warehouseId: true,
                        name: true,
                        location: true,
                        capacity: true,
                        status: true
                    }
                },
                equipment: {
                    select: {
                        id: true,
                        equipmentId: true,
                        name: true,
                        type: true,
                        serialNumber: true,
                        manufacturer: true,
                        description: true
                    }
                },
                inventoryLedgers: {
                    orderBy: { createdAt: 'desc' },
                    take: 10 // Last 10 transactions
                }
            }
        });

        if (!inventory) {
            throw new NotFoundException("Inventory not found");
        }

        return inventory;
    },

    // Get inventory ledger history
    async getInventoryLedger(req) {
        const { page, pageSize, where, index } = buildQueryPrisma(req.query);

        // Build custom filters
        const filters = { ...where };

        // Filter by inventory ID (support both ObjectId and custom inventoryId like INV-001)
        if (req.query.inventory_id) {
            const inventory = await this.findInventory(req.query.inventory_id);
            if (inventory) {
                filters.inventoryId = inventory.id; // Use ObjectId for query
            } else {
                // If inventory not found, return empty result
                return {
                    page: page,
                    pageSize: pageSize,
                    totalItem: 0,
                    totalPage: 0,
                    items: [],
                };
            }
        }

        // Filter by movement type
        if (req.query.movement_type) {
            filters.movementType = req.query.movement_type;
        }

        // Filter by date range
        if (req.query.date_from || req.query.date_to) {
            filters.createdAt = {};
            if (req.query.date_from) {
                filters.createdAt.gte = new Date(req.query.date_from);
            }
            if (req.query.date_to) {
                filters.createdAt.lte = new Date(req.query.date_to);
            }
        }

        const resultPrismaPromise = prisma.inventoryLedger.findMany({
            where: filters,
            skip: index,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            include: {
                inventory: {
                    select: {
                        id: true,
                        inventoryId: true,
                        quantity: true,
                        stockStatus: true,
                        warehouse: {
                            select: {
                                warehouseId: true,
                                name: true,
                                location: true
                            }
                        },
                        equipment: {
                            select: {
                                equipmentId: true,
                                name: true,
                                type: true
                            }
                        }
                    }
                }
            }
        });

        const totalItemPromise = prisma.inventoryLedger.count({
            where: filters,
        });

        const [resultPrisma, totalItem] = await Promise.all([resultPrismaPromise, totalItemPromise]);

        return {
            page: page,
            pageSize: pageSize,
            totalItem: totalItem,
            totalPage: Math.ceil(totalItem / pageSize),
            items: resultPrisma,
        };
    }
};
