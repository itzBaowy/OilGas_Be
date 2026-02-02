import prisma from "../prisma/connect.prisma.js";
import { BadRequestException } from "../common/helpers/exception.helper.js";
import { validateEquipmentData, validateEquipmentUpdateData } from "../common/helpers/validate.helper.js";

export const equipmentService = {

    async generateCustomId() {
    try {
        
        const updatedSequence = await prisma.sequence.upsert({
            where: { name: "equipment" },
            update: { value: { increment: 1 } }, // Nếu có rồi thì +1
            create: { name: "equipment", value: 1 } // Nếu chưa có thì tạo mới bằng 1
        });

        const nextValue = updatedSequence.value;

        // Trả về định dạng EQ-001, EQ-002...
        return `EQ-${String(nextValue).padStart(3, '0')}`;
    } catch (error) {
        throw new Error(`Failed to generate custom ID: ${error.message}`);
    }
    },


    async createEquipment(req) {
        // Validate equipment data using helper
        const { parsedInstallDate } = validateEquipmentData(req.body);

        const { name, serialNumber, type, status, location, manufacturer, description, specifications } = req.body;

        // Check if name already exists
        const existingName = await prisma.equipment.findUnique({
            where: { name }
        });
        if (existingName) {
            throw new BadRequestException(`Equipment with name "${name}" already exists`);
        }

        // Check if serialNumber already exists
        const existingSerial = await prisma.equipment.findUnique({
            where: { serialNumber }
        });
        if (existingSerial) {
            throw new BadRequestException(`Equipment with serial number "${serialNumber}" already exists`);
        }

        // Generate custom ID
        const equipmentId = await this.generateCustomId();

        // Create equipment
        const equipment = await prisma.equipment.create({
            data: {
                equipmentId,
                name,
                serialNumber,
                type,
                status: status ,
                location,
                manufacturer,
                installDate: parsedInstallDate,
                description,
                specifications: specifications || {},
                isDeleted: false
            }
        });

        return equipment;
    },

//Get list equipments
    async getAllEquipment(req) {
        const { page = 1, pageSize = 10, search, type, status, location } = req.query;

        const pageNum = parseInt(page);
        const limit = parseInt(pageSize);
        const skip = (pageNum - 1) * limit;

        const where = {
            isDeleted: false
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { serialNumber: { contains: search, mode: "insensitive" } }
            ];
        }
        if (type) {
            where.type = type;
        }

        if (status) {
            where.status = status;
        }

        if (location) {
            where.location = { contains: location, mode: "insensitive" };
        }

        const [items, totalItem] = await Promise.all([
            prisma.equipment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" }
            }),
            prisma.equipment.count({ where })
        ]);

        return {
            page: pageNum,
            pageSize: limit,
            totalItem,
            totalPage: Math.ceil(totalItem / limit),
            items
        };
    },

    async getEquipmentById(equipmentId) {
        const equipment = await prisma.equipment.findUnique({
            where: { equipmentId }
        });

        if (!equipment || equipment.isDeleted) {
            throw new BadRequestException("Equipment not found");
        }

        return equipment;
    },

//Update equipment by equipmentId (EQ-001, EQ-002, etc.)
    async updateEquipment(req) {
        const { id: equipmentId } = req.params;
        const { name, type, location, status, specifications, description } = req.body;

        // Check if equipment exists
        const existingEquipment = await prisma.equipment.findUnique({
            where: { equipmentId }
        });

        if (!existingEquipment || existingEquipment.isDeleted) {
            throw new BadRequestException("Equipment not found");
        }

        // Validate update data (type and status if provided)
        validateEquipmentUpdateData(req.body);

        // Check name uniqueness if changed
        if (name && name !== existingEquipment.name) {
            const existingName = await prisma.equipment.findUnique({
                where: { name }
            });
            if (existingName) {
                throw new BadRequestException(`Equipment with name "${name}" already exists`);
            }
        }

        // Check if status is changing
        if (status && status !== existingEquipment.status) {
            console.log(`Status changed from ${existingEquipment.status} to ${status} for equipment ${existingEquipment.equipmentId}`);
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (type) updateData.type = type;
        if (status) updateData.status = status;
        if (location) updateData.location = location;
        if (description !== undefined) updateData.description = description;
        if (specifications !== undefined) updateData.specifications = specifications;

        // Update equipment
        const updatedEquipment = await prisma.equipment.update({
            where: { equipmentId },
            data: updateData
        });

        return updatedEquipment;
    },

    async deleteEquipment(equipmentId) {
        // Check if equipment exists
        const equipment = await prisma.equipment.findUnique({
            where: { equipmentId }
        });

        if (!equipment || equipment.isDeleted) {
            throw new BadRequestException("Equipment not found");
        }

        if (equipment.status === "Active") {
            throw new BadRequestException("Cannot delete active equipment. Please change status to Inactive or Maintenance before deleting.");
        }

        const deletedEquipment = await prisma.equipment.update({
            where: { equipmentId },
            data: { isDeleted: true }
        });

        return deletedEquipment;
    }
};
