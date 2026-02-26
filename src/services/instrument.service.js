import prisma from "../prisma/connect.prisma.js";
import { NotFoundException } from "../common/helpers/exception.helper.js";
import {
  getInstrumentTypes,
  getInstrumentStatuses,
  validateInstrumentData,
  validateInstrumentUpdateData,
} from "../common/helpers/validate.helper.js";

export const instrumentService = {

  async generateCustomId() {
    try {
      const updatedSequence = await prisma.sequence.upsert({
        where: { name: "instrument" },
        update: { value: { increment: 1 } },
        create: { name: "instrument", value: 1 },
      });

      const nextValue = updatedSequence.value;
      return `INS-${String(nextValue).padStart(3, "0")}`;
    } catch (error) {
      throw new Error(`Failed to generate custom ID: ${error.message}`);
    }
  },

  getTypes() {
    return getInstrumentTypes();
  },

  getStatuses() {
    return getInstrumentStatuses();
  },

  async getLocations() {
    const instruments = await prisma.instrument.findMany({
      where: { isDeleted: false },
      select: { location: true },
      distinct: ["location"],
    });

    return instruments.map((i, index) => ({
      id: `loc-${index + 1}`,
      value: i.location,
      label: i.location,
    }));
  },

  async getAllInstruments(req) {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      location,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      isDeleted: false,
    };

    // Exact match filters
    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    // Partial match for location (case-insensitive)
    if (location) {
      where.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    // Search in name, instrumentId, manufacturer
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { instrumentId: { contains: search, mode: "insensitive" } },
        { manufacturer: { contains: search, mode: "insensitive" } },
      ];
    }

    // Execute queries in parallel
    const [items, total] = await Promise.all([
      prisma.instrument.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: "asc" },
        include: {
          assignedEngineers: {
            select: {
              id: true,
              engineerId: true,
              engineerName: true,
              engineerEmail: true,
              role: true,
              assignedAt: true,
            },
          },
        },
      }),
      prisma.instrument.count({ where }),
    ]);

    // Format response
    const formattedItems = items.map((item) => ({
      ...item,
      assignedEngineers: item.assignedEngineers.map((eng) => ({
        id: eng.engineerId,
        name: eng.engineerName,
        email: eng.engineerEmail,
        role: eng.role,
        assignedAt: eng.assignedAt,
      })),
    }));

    return {
      items: formattedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  },

  async getInstrumentById(id) {

    const instrument = await prisma.instrument.findFirst({
      where: {
        instrumentId: id,
        isDeleted: false,
      },
      include: {
        assignedEngineers: {
          select: {
            id: true,
            engineerId: true,
            engineerName: true,
            engineerEmail: true,
            role: true,
            assignedAt: true,
          },
        },
      },
    });

    if (!instrument) {
      throw new NotFoundException("Instrument not found");
    }

    // Format response
    return {
      ...instrument,
      assignedEngineers: instrument.assignedEngineers.map((eng) => ({
        id: eng.engineerId,
        name: eng.engineerName,
        email: eng.engineerEmail,
        role: eng.role,
        assignedAt: eng.assignedAt,
      })),
    };
  },

  async createInstrument(req) {
    const {
      name,
      type,
      location,
      manufacturer,
      model,
      installDate,
      status = "Active",
      description,
    } = req.body;

    // Validate data using helper
    const { parsedInstallDate } = validateInstrumentData(req.body);

    // Generate custom ID
    const instrumentId = await this.generateCustomId();

    // Create instrument
    const instrument = await prisma.instrument.create({
      data: {
        instrumentId,
        name,
        type,
        location,
        manufacturer,
        model,
        installDate: parsedInstallDate,
        status,
        description,
        isDeleted: false,
      },
      include: {
        assignedEngineers: true,
      },
    });

    return instrument;
  },

  /**
   * Update instrument
   */
  async updateInstrument(req) {
    const { id } = req.params;
    const {
      name,
      type,
      location,
      manufacturer,
      model,
      installDate,
      status,
      description,
      lastMaintenanceDate,
      nextMaintenanceDate,
    } = req.body;

    // Check if instrument exists
    const existingInstrument = await prisma.instrument.findFirst({
      where: {
        instrumentId: id,
        isDeleted: false,
      },
    });

    if (!existingInstrument) {
      throw new NotFoundException("Instrument not found");
    }

    // Validate update data using helper
    const { parsedInstallDate, parsedLastMaintenanceDate, parsedNextMaintenanceDate } = 
      validateInstrumentUpdateData(req.body);

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (location !== undefined) updateData.location = location;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (model !== undefined) updateData.model = model;
    if (installDate !== undefined)
      updateData.installDate = parsedInstallDate;
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (lastMaintenanceDate !== undefined)
      updateData.lastMaintenanceDate = parsedLastMaintenanceDate;
    if (nextMaintenanceDate !== undefined)
      updateData.nextMaintenanceDate = parsedNextMaintenanceDate;

    // Update instrument
    const updatedInstrument = await prisma.instrument.update({
      where: { id: existingInstrument.id },
      data: updateData,
      include: {
        assignedEngineers: {
          select: {
            id: true,
            engineerId: true,
            engineerName: true,
            engineerEmail: true,
            role: true,
            assignedAt: true,
          },
        },
      },
    });

    return {
      ...updatedInstrument,
      assignedEngineers: updatedInstrument.assignedEngineers.map((eng) => ({
        id: eng.engineerId,
        name: eng.engineerName,
        email: eng.engineerEmail,
        role: eng.role,
        assignedAt: eng.assignedAt,
      })),
    };
  },

  /**
   * Decommission instrument
   */
  async decommissionInstrument(req) {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if instrument exists
    const existingInstrument = await prisma.instrument.findFirst({
      where: {
        instrumentId: id,
        isDeleted: false,
      },
    });

    if (!existingInstrument) {
      throw new NotFoundException("Instrument not found");
    }

    // Check if already decommissioned
    if (existingInstrument.status === "Decommissioned") {
      throw new BadRequestException("Instrument is already decommissioned");
    }

    // Update instrument
    const updatedInstrument = await prisma.instrument.update({
      where: { id: existingInstrument.id },
      data: {
        status: "Decommissioned",
        decommissionReason: reason || null,
        decommissionedAt: new Date(),
      },
      include: {
        assignedEngineers: {
          select: {
            id: true,
            engineerId: true,
            engineerName: true,
            engineerEmail: true,
            role: true,
            assignedAt: true,
          },
        },
      },
    });

    return updatedInstrument;
  },

  /**
   * Assign engineer to instrument
   */
  async assignEngineer(req) {
    const { id } = req.params;
    const { engineerId, role } = req.body;

    // Validate role
    if (!role || !["Primary", "Support"].includes(role)) {
      throw new BadRequestException("Role must be 'Primary' or 'Support'");
    }

    // Check if instrument exists
    const instrument = await prisma.instrument.findFirst({
      where: {
        instrumentId: id,
        isDeleted: false,
      },
    });

    if (!instrument) {
      throw new NotFoundException("Instrument not found");
    }

    // Check if engineer (user) exists
    const engineer = await prisma.user.findUnique({
      where: { id: engineerId },
      include: { role: true },
    });

    if (!engineer) {
      throw new NotFoundException("Engineer not found");
    }

    // Check if user has Engineer role
    if (engineer.role.name !== "Engineer") {
      throw new BadRequestException("User is not an Engineer");
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.instrumentEngineer.findUnique({
      where: {
        instrumentId_engineerId: {
          instrumentId: instrument.id,
          engineerId: engineerId,
        },
      },
    });

    if (existingAssignment) {
      throw new BadRequestException("Engineer already assigned to this instrument");
    }

    // Create assignment
    const assignment = await prisma.instrumentEngineer.create({
      data: {
        instrumentId: instrument.id,
        engineerId: engineerId,
        engineerName: engineer.fullName,
        engineerEmail: engineer.email,
        role,
      },
    });

    return {
      id: assignment.engineerId,
      name: assignment.engineerName,
      email: assignment.engineerEmail,
      role: assignment.role,
      assignedAt: assignment.assignedAt,
    };
  },

  /**
   * Remove engineer assignment from instrument
   */
  async removeEngineerAssignment(req) {
    const { id, engineerId } = req.params;

    // Check if instrument exists
    const instrument = await prisma.instrument.findFirst({
      where: {
        instrumentId: id,
        isDeleted: false,
      },
    });

    if (!instrument) {
      throw new NotFoundException("Instrument not found");
    }

    // Check if assignment exists
    const assignment = await prisma.instrumentEngineer.findUnique({
      where: {
        instrumentId_engineerId: {
          instrumentId: instrument.id,
          engineerId: engineerId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException("Engineer assignment not found");
    }

    // Delete assignment
    await prisma.instrumentEngineer.delete({
      where: {
        instrumentId_engineerId: {
          instrumentId: instrument.id,
          engineerId: engineerId,
        },
      },
    });

    return { message: "Engineer assignment removed successfully" };
  },
};
