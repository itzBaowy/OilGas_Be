import prisma from "../prisma/connect.prisma.js";
import { BadRequestException, NotFoundException } from "../common/helpers/exception.helper.js";
import {
  validateEquipmentData,
  validateEquipmentUpdateData,
} from "../common/helpers/validate.helper.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";
import { notifyMaintenanceScheduled } from "../common/helpers/notification.helper.js";

export const equipmentService = {
  async generateCustomId() {
    try {
      const updatedSequence = await prisma.sequence.upsert({
        where: { name: "equipment" },
        update: { value: { increment: 1 } }, 
        create: { name: "equipment", value: 1 },
      });

      const nextValue = updatedSequence.value;

      return `EQ-${String(nextValue).padStart(3, "0")}`;
    } catch (error) {
      throw new Error(`Failed to generate custom ID: ${error.message}`);
    }
  },

  async createEquipment(req) {
    // Validate equipment data using helper
    const { parsedInstallDate, normalizedType } = validateEquipmentData(
      req.body,
    );

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
      expiredDate,
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
        type: normalizedType, 
        model,
        status: status,
        location,
        manufacturer,
        installDate: parsedInstallDate,
        expiredDate: expiredDate ? new Date(expiredDate) : parsedInstallDate, 
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
    const { page = 1, limit = 10, type, status, location, search } = req.query;

    // Parse page và pageSize thành số nguyên
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const where = { isDeleted: false };
    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }
    if (location) {
      where.location = {
        contains: location,
        mode: "insensitive",
      };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    const resultPrismaPromise = prisma.equipment.findMany({
      where: where,
      skip: skip,
      take: limitNum,
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
      page: pageNum,
      pageSize: limitNum,
      totalItem: totalItem,
      totalPage: Math.ceil(totalItem / limitNum),
      items: resultPrisma,
    };
  },

  async getEquipmentById(equipmentId) {
    const equipment = await prisma.equipment.findUnique({
      where: { equipmentId },
    });

    if (!equipment || equipment.isDeleted) {
      throw new NotFoundException("Equipment not found");
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
      expiredDate,
    } = req.body;

    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { equipmentId },
    });

    if (!existingEquipment || existingEquipment.isDeleted) {
      throw new NotFoundException("Equipment not found");
    }

    // Validate update data (type and status if provided)
    const { normalizedType } = validateEquipmentUpdateData(req.body);

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

    const updateData = {};
    if (name) updateData.name = name;
    if (type) updateData.type = normalizedType; // Use normalized type
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
    if (expiredDate !== undefined)
      updateData.expiredDate = new Date(expiredDate);
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
      throw new NotFoundException("Equipment not found");
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

    if (where.type && typeof where.type === "object" && where.type.contains) {
      where.type = where.type.contains;
    }
    if (where.status && typeof where.status === "object" && where.status.contains) {
      where.status = where.status.contains;
    }

    if (req.query.equipmentId) {
      const equipment = await prisma.equipment.findUnique({
        where: { equipmentId: req.query.equipmentId },
      });
      if (equipment) {
        where.equipmentId = equipment.id; // Use ObjectId for exact match
      } else {
        return {
          page: page,
          pageSize: pageSize,
          totalItem: 0,
          totalPage: 0,
          items: [],
        };
      }
    }

    // Add date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      where.date = {};

      if (req.query.startDate) {
        // Set to start of day (00:00:00.000)
        const startDate = new Date(req.query.startDate);
        startDate.setHours(0, 0, 0, 0);
        where.date.gte = startDate;
      }

      if (req.query.endDate) {
        // Set to end of day (23:59:59.999)
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
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
          },
        },
      },
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
    const equipment = await prisma.equipment.findUnique({
      where: { equipmentId },
    });

    if (!equipment || equipment.isDeleted) {
      throw new NotFoundException("Equipment not found");
    }

    // Build where clause with optional date range
    const whereClause = {
      equipmentId: equipment.id,
    };

    // Add date range filter if provided
    if (queryParams.startDate || queryParams.endDate) {
      whereClause.date = {};

      if (queryParams.startDate) {
        // Set to start of day (00:00:00.000)
        const startDate = new Date(queryParams.startDate);
        startDate.setHours(0, 0, 0, 0);
        whereClause.date.gte = startDate;
      }

      if (queryParams.endDate) {
        // Set to end of day (23:59:59.999)
        const endDate = new Date(queryParams.endDate);
        endDate.setHours(23, 59, 59, 999);
        whereClause.date.lte = endDate;
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

  getTypes() {
    // Return predefined equipment types for dropdown
    return ["Pump", "Valve", "Compressor", "Sensor", "Other"];
  },

  async getMaintenanceTypes() {
    // Get distinct maintenance types using Prisma's distinct feature
    const maintenanceHistory = await prisma.maintenanceHistory.findMany({
      distinct: ["type"],
      select: {
        type: true,
      },
    });

    // Convert to uppercase, filter null/empty strings, remove duplicates, and sort
    const uniqueTypes = [
      ...new Set(
        maintenanceHistory
          .map((mh) => mh.type)
          .filter((type) => type && type.trim() !== "")
          .map((type) => type.toUpperCase()),
      ),
    ].sort();

    return uniqueTypes;
  },

  async createMaintenanceSchedule(req) {
    const { equipmentId } = req.params;
    const { engineerId, type, date, description, cost } = req.body;

    // --- Validate required fields ---
    if (!type || !type.trim()) {
      throw new BadRequestException("Maintenance type is required");
    }
    if (!date) {
      throw new BadRequestException("Scheduled date is required");
    }
    if (!engineerId || !engineerId.trim()) {
      throw new BadRequestException("Responsible engineer is required");
    }

    // --- Validate maintenance type ---
    const validTypes = [
      "Preventive",
      "Corrective",
      "Calibration",
      "Inspection",
      "Replacement",
    ];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(
        `Invalid maintenance type. Must be one of: ${validTypes.join(", ")}`,
      );
    }

    // --- Validate scheduled date is in the future ---
    const scheduledDate = new Date(date);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException("Invalid date format");
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Compare at day level
    if (scheduledDate < now) {
      throw new BadRequestException("Scheduled date must be today or in the future");
    }

    // --- Find equipment ---
    const equipment = await prisma.equipment.findUnique({
      where: { equipmentId },
    });
    if (!equipment || equipment.isDeleted) {
      throw new NotFoundException("Equipment not found");
    }

    // --- Find engineer and validate role ---
    const engineer = await prisma.user.findUnique({
      where: { id: engineerId },
      include: { role: true },
    });
    if (!engineer) {
      throw new BadRequestException("Engineer not found");
    }
    if (engineer.role.name !== "Engineer") {
      throw new BadRequestException(
        `User "${engineer.fullName}" is not an Engineer (current role: ${engineer.role.name})`,
      );
    }

    // --- Create maintenance schedule record ---
    const maintenanceRecord = await prisma.maintenanceHistory.create({
      data: {
        equipmentId: equipment.id, // Use ObjectId
        date: scheduledDate,
        type: type,
        description: description && description.trim()
          ? description.trim()
          : `Scheduled ${type} maintenance for ${equipment.name}`,
        performedBy: engineer.fullName,
        status: "Scheduled",
        cost: cost != null ? parseFloat(cost) : null,
      },
    });

    // --- Update equipment.nextMaintenanceDate if this schedule is sooner ---
    if (
      !equipment.nextMaintenanceDate ||
      scheduledDate < new Date(equipment.nextMaintenanceDate)
    ) {
      await prisma.equipment.update({
        where: { equipmentId },
        data: { nextMaintenanceDate: scheduledDate },
      });
    }

    // Send notification to the assigned engineer (non-blocking) 
    notifyMaintenanceScheduled(
      engineerId,
      equipment,
      scheduledDate,
      type,
      req.user?.id,
    );

    return maintenanceRecord;
  },

  async updateMaintenanceStatus(req) {
    const { id } = req.params;
    const { status, cost, notes } = req.body;

    //Validate required fields
    if (!status || !status.trim()) {
      throw new BadRequestException("Status is required");
    }

    const validStatuses = ["Scheduled", "In Progress", "Completed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    //Find maintenance record 
    const record = await prisma.maintenanceHistory.findUnique({
      where: { id },
      include: {
        equipment: true,
      },
    });
    if (!record) {
      throw new NotFoundException("Maintenance record not found");
    }

    // Authorization: check if user can update this record
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });
    const roleName = currentUser?.role?.name || "";
    const isAdminOrSupervisor =
      roleName === "Admin" ||
      roleName === "Supervisor" ||
      roleName === "Field Supervisor";
    const isAssignedEngineer = record.performedBy === currentUser?.fullName;

    if (!isAdminOrSupervisor && !isAssignedEngineer) {
      throw new BadRequestException(
        "You are not authorized to update this maintenance record. Only the assigned engineer or an admin/supervisor can update it.",
      );
    }

    // State machine: validate transition
    const allowedTransitions = {
      Scheduled: ["In Progress", "Cancelled"],
      "In Progress": ["Completed", "Cancelled"],
    };

    const allowed = allowedTransitions[record.status];
    if (!allowed) {
      throw new BadRequestException(
        `Cannot update status from "${record.status}". This record is already finalized.`,
      );
    }
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Invalid transition: "${record.status}" → "${status}". Allowed: ${allowed.join(", ")}`,
      );
    }

    // Build update data 
    const updateData = { status };

    // Allow updating cost when completing
    if (cost != null) {
      updateData.cost = parseFloat(cost);
    }

    // Allow appending notes to description
    if (notes && notes.trim()) {
      updateData.description = record.description
        ? `${record.description}\n[${status}] ${notes.trim()}`
        : `[${status}] ${notes.trim()}`;
    }

    // Update the record 
    const updatedRecord = await prisma.maintenanceHistory.update({
      where: { id },
      data: updateData,
      include: {
        equipment: {
          select: {
            equipmentId: true,
            name: true,
          },
        },
      },
    });

    // Side effects on Completed
    if (status === "Completed" && record.equipment) {
      await prisma.equipment.update({
        where: { id: record.equipmentId },
        data: {
          lastMaintenanceDate: new Date(),
          status: "Active",
        },
      });
    }

    return updatedRecord;
  },
};
