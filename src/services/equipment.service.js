import prisma from "../prisma/connect.prisma.js";
import { BadRequestException } from "../common/helpers/exception.helper.js";
import {
  validateEquipmentData,
  validateEquipmentUpdateData,
} from "../common/helpers/validate.helper.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";

export const equipmentService = {
  async generateCustomId() {
    try {
      const updatedSequence = await prisma.sequence.upsert({
        where: { name: "equipment" },
        update: { value: { increment: 1 } }, // Nếu có rồi thì +1
        create: { name: "equipment", value: 1 }, // Nếu chưa có thì tạo mới bằng 1
      });

      const nextValue = updatedSequence.value;

      // Trả về định dạng EQ-001, EQ-002...
      return `EQ-${String(nextValue).padStart(3, "0")}`;
    } catch (error) {
      throw new Error(`Failed to generate custom ID: ${error.message}`);
    }
  },

  async createEquipment(req) {
    // Validate equipment data using helper
    const { parsedInstallDate } = validateEquipmentData(req.body);

    const {
      name,
      serialNumber,
      type,
      status,
      location,
      model,
      manufacturer,
      description,
      specifications,
      lastMaintenanceDate,
      nextMaintenanceDate,
    } = req.body;

    // Check if name already exists
    const existingName = await prisma.equipment.findUnique({
      where: { name },
    });
    if (existingName) {
      throw new BadRequestException(
        `Equipment with name "${name}" already exists`,
      );
    }

    // Check if serialNumber already exists
    const existingSerial = await prisma.equipment.findUnique({
      where: { serialNumber },
    });
    if (existingSerial) {
      throw new BadRequestException(
        `Equipment with serial number "${serialNumber}" already exists`,
      );
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
        model,
        status: status,
        location,
        manufacturer,
        installDate: parsedInstallDate,
        lastMaintenanceDate: lastMaintenanceDate
          ? new Date(lastMaintenanceDate)
          : null,
        nextMaintenanceDate: nextMaintenanceDate
          ? new Date(nextMaintenanceDate)
          : null,
        description,
        specifications: specifications || {},
        isDeleted: false,
      },
    });

    return equipment;
  },

  //Get list equipments
  async getAllEquipment(req) {
    const { page, pageSize, where, index } = buildQueryPrisma(req.query);

    // Thêm điều kiện isDeleted
    where.isDeleted = false;

    const resultPrismaPromise = prisma.equipment.findMany({
      where: where,
      skip: index,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    const totalItemPromise = prisma.equipment.count({
      where: where,
    });

    const [resultPrisma, totalItem] = await Promise.all([
      resultPrismaPromise,
      totalItemPromise,
    ]);

    return {
      page: page,
      pageSize: pageSize,
      totalItem: totalItem,
      totalPage: Math.ceil(totalItem / pageSize),
      items: resultPrisma,
    };
  },

  async getEquipmentById(equipmentId) {
    const equipment = await prisma.equipment.findUnique({
      where: { equipmentId },
    });

    if (!equipment || equipment.isDeleted) {
      throw new BadRequestException("Equipment not found");
    }

    return equipment;
  },

  //Update equipment by equipmentId (EQ-001, EQ-002, etc.)
  async updateEquipment(req) {
    const { id: equipmentId } = req.params;
    const {
      name,
      type,
      location,
      status,
      specifications,
      model,
      description,
      lastMaintenanceDate,
      nextMaintenanceDate,
      manufacturer,
      installDate,
    } = req.body;

    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { equipmentId },
    });

    if (!existingEquipment || existingEquipment.isDeleted) {
      throw new BadRequestException("Equipment not found");
    }

    // Validate update data (type and status if provided)
    validateEquipmentUpdateData(req.body);

    // Check name uniqueness if changed
    if (name && name !== existingEquipment.name) {
      const existingName = await prisma.equipment.findUnique({
        where: { name },
      });
      if (existingName) {
        throw new BadRequestException(
          `Equipment with name "${name}" already exists`,
        );
      }
    }

    // Check if status is changing
    if (status && status !== existingEquipment.status) {
      console.log(
        `Status changed from ${existingEquipment.status} to ${status} for equipment ${existingEquipment.equipmentId}`,
      );
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (model) updateData.model = model;
    if (status) updateData.status = status;
    if (location) updateData.location = location;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (description !== undefined) updateData.description = description;
    if (specifications !== undefined)
      updateData.specifications = specifications;
    if (lastMaintenanceDate !== undefined)
      updateData.lastMaintenanceDate = lastMaintenanceDate
        ? new Date(lastMaintenanceDate)
        : null;
    if (nextMaintenanceDate !== undefined)
      updateData.nextMaintenanceDate = nextMaintenanceDate
        ? new Date(nextMaintenanceDate)
        : null;
    if (installDate !== undefined)
      updateData.installDate = new Date(installDate);
    // Update equipment
    const updatedEquipment = await prisma.equipment.update({
      where: { equipmentId },
      data: updateData,
    });

    return updatedEquipment;
  },

  async deleteEquipment(equipmentId) {
    // Check if equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { equipmentId },
    });

    if (!equipment || equipment.isDeleted) {
      throw new BadRequestException("Equipment not found");
    }

    if (equipment.status === "Active") {
      throw new BadRequestException(
        "Cannot delete active equipment. Please change status to Inactive or Maintenance before deleting.",
      );
    }

    const deletedEquipment = await prisma.equipment.update({
      where: { equipmentId },
      data: { isDeleted: true },
    });

    return deletedEquipment;
  },
  async getAllMaintenanceHistory(req) {
    const { page, pageSize, where, index } = buildQueryPrisma(req.query);

    // Add date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      where.date = {};

      if (req.query.startDate) {
        where.date.gte = new Date(req.query.startDate);
      }

      if (req.query.endDate) {
        where.date.lte = new Date(req.query.endDate);
      }
    }

    // Get maintenance history with equipment details
    const maintenanceHistoryPromise = prisma.maintenanceHistory.findMany({
      where: where,
      skip: index,
      take: pageSize,
      orderBy: { date: "desc" },
      include: {
        equipment: {
          select: {
            equipmentId: true,
            name: true,
            type: true,
            model: true,
            serialNumber: true,
          }
        }
      }
    });

    const totalItemPromise = prisma.maintenanceHistory.count({
      where: where,
    });

    const [maintenanceHistory, totalItem] = await Promise.all([
      maintenanceHistoryPromise,
      totalItemPromise,
    ]);

    return {
      page: page,
      pageSize: pageSize,
      totalItem: totalItem,
      totalPage: Math.ceil(totalItem / pageSize),
      items: maintenanceHistory,
    };
  },

  async getMaintenanceHistory(equipmentId, queryParams = {}) {
    // First, get the equipment by equipmentId (EQ-001, EQ-002, etc.) to get the ObjectId
    const equipment = await prisma.equipment.findUnique({
      where: { equipmentId },
    });

    if (!equipment || equipment.isDeleted) {
      throw new BadRequestException("Equipment not found");
    }

    // Build where clause with optional date range
    const whereClause = {
      equipmentId: equipment.id, // Use ObjectId here
    };

    // Add date range filter if provided
    if (queryParams.startDate || queryParams.endDate) {
      whereClause.date = {};

      if (queryParams.startDate) {
        whereClause.date.gte = new Date(queryParams.startDate);
      }

      if (queryParams.endDate) {
        whereClause.date.lte = new Date(queryParams.endDate);
      }
    }

    // Get maintenance history sorted by date descending (newest first)
    const maintenanceHistory = await prisma.maintenanceHistory.findMany({
      where: whereClause,
      orderBy: {
        date: "desc",
      },
    });

    // Return empty array with appropriate message if no records found
    return maintenanceHistory;
  },
  getStatuses() {
    return ["Active", "Inactive", "Maintenance"];
  },
};
