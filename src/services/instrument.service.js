import prisma from "../prisma/connect.prisma.js";
import { NotFoundException, BadRequestException } from "../common/helpers/exception.helper.js";
import {
  getInstrumentTypes,
  getInstrumentStatuses,
  validateInstrumentData,
  validateInstrumentUpdateData,
} from "../common/helpers/validate.helper.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";

// Helper function to build where clause based on ID type (ObjectId vs custom instrumentId)
const buildIdWhereClause = (id) => {
  const isObjectId = /^[a-fA-F0-9]{24}$/.test(id);
  return isObjectId
    ? { id: id, isDeleted: false }
    : { instrumentId: id, isDeleted: false };
};

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
      where: buildIdWhereClause(id),
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
      where: buildIdWhereClause(id),
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
      where: buildIdWhereClause(id),
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
      where: buildIdWhereClause(id),
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
      where: buildIdWhereClause(id),
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

  /**
   * Get all instrument maintenance history with filters and pagination
   * Similar to equipment maintenance history
   */
  async getAllInstrumentMaintenanceHistory(req) {
    const { page, pageSize, where, index } = buildQueryPrisma(req.query);

    // Override filters for exact match (type, status)
    // buildQueryPrisma converts strings to contains, but we need exact match for these fields
    if (where.type && typeof where.type === "object" && where.type.contains) {
      where.type = where.type.contains;
    }
    if (where.status && typeof where.status === "object" && where.status.contains) {
      where.status = where.status.contains;
    }

    // Only show records that belong to an instrument
    where.instrumentId = { not: null };

    // Special handling for instrumentId filter from query params
    // instrumentId in filters is custom ID (INS-001), not ObjectId
    // Need to filter through instrument relation
    if (req.query.instrumentId) {
      const customInstrumentId = req.query.instrumentId;
      // Use nested where for instrument relation
      where.instrument = where.instrument || {};
      where.instrument.instrumentId = customInstrumentId;
      delete where.instrumentId; // Remove any direct filter, re-add the not-null check
      // Ensure we still only get records with instruments
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

    // Search across multiple fields using OR condition
    // Supports searching in: description, performedBy, instrument name
    if (req.query.search) {
      const searchTerm = req.query.search;
      const searchConditions = [
        { description: { contains: searchTerm, mode: "insensitive" } },
        { performedBy: { contains: searchTerm, mode: "insensitive" } },
        { instrument: { name: { contains: searchTerm, mode: "insensitive" } } },
      ];
      // Merge with existing OR conditions (if any from buildQueryPrisma filters)
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Get maintenance history with instrument and equipment details
    const maintenanceHistoryPromise = prisma.maintenanceHistory.findMany({
      where: where,
      skip: index,
      take: pageSize,
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        type: true,
        description: true,
        performedBy: true,
        status: true,
        cost: true,
        createdAt: true,
        updatedAt: true,
        instrument: {
          select: {
            instrumentId: true,
            name: true,
            type: true,
            model: true,
            location: true,
          },
        },
        equipment: {
          select: {
            equipmentId: true,
            name: true,
            type: true,
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

    // Map to include instrumentId at top level (custom ID, not ObjectId)
    const items = maintenanceHistory.map(item => ({
      ...item,
      instrumentId: item.instrument?.instrumentId, // Use custom ID (INS-001) instead of ObjectId
    }));

    return {
      page: page,
      pageSize: pageSize,
      totalItem: totalItem,
      totalPage: Math.ceil(totalItem / pageSize),
      items: items,
    };
  },

  /**
   * Get maintenance history for a specific instrument
   */
  async getInstrumentMaintenanceHistory(instrumentId, queryParams = {}) {
    // First, get the instrument by instrumentId (INS-001, INS-002, etc.) to get the ObjectId
    const instrument = await prisma.instrument.findUnique({
      where: { instrumentId },
    });

    if (!instrument || instrument.isDeleted) {
      throw new NotFoundException("Instrument not found");
    }

    // Build where clause — get maintenance records linked to this instrument
    const whereClause = {
      instrumentId: instrument.id, // Use ObjectId here
    };

    // Add date range filter if provided
    if (queryParams.startDate || queryParams.endDate) {
      whereClause.date = {};

      if (queryParams.startDate) {
        const startDate = new Date(queryParams.startDate);
        startDate.setHours(0, 0, 0, 0);
        whereClause.date.gte = startDate;
      }

      if (queryParams.endDate) {
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
      include: {
        equipment: {
          select: {
            equipmentId: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return maintenanceHistory;
  },

  /**
   * Get distinct maintenance types for instruments
   */
  async getInstrumentMaintenanceTypes() {
    // Return predefined maintenance types (matching seed data)
    const maintenanceTypes = [
      "Preventive",
      "Corrective",
      "Calibration",
      "Inspection",
      "Replacement"
    ];

    return maintenanceTypes;
  },

  /**
   * Get distinct maintenance statuses for instruments
   */
  async getInstrumentMaintenanceStatuses() {
    const maintenanceStatuses = [
      "Completed",
      "In Progress",
      "Scheduled",
      "Pending",
      "Cancelled"
    ];
    return maintenanceStatuses;
  },

  /**
   * Get maintenance records GROUPED by Instrument (for Accordion view)
   * Returns groups with instrument info, summary stats, and nested records
   * @param {Object} queryParams - { type, status, startDate, endDate, search }
   */
  async getMaintenanceGrouped(queryParams = {}) {
    const { type, status, startDate, endDate, search } = queryParams;

    // Build where clause for maintenance records
    const where = {};

    if (type) {
      where.type = { equals: type, mode: "insensitive" };
    }

    if (status) {
      where.status = { equals: status, mode: "insensitive" };
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        // Set to start of day (00:00:00.000)
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (endDate) {
        // Set to end of day (23:59:59.999)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Search in description, performedBy
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { performedBy: { contains: search, mode: "insensitive" } },
        { instrument: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Only include records that belong to an instrument
    where.instrumentId = { not: null };

    // Get all maintenance records with instrument info
    const maintenanceRecords = await prisma.maintenanceHistory.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        instrument: {
          select: {
            id: true,
            instrumentId: true,
            name: true,
            type: true,
            location: true,
            status: true,
          },
        },
        equipment: {
          select: {
            id: true,
            equipmentId: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Group records by instrument
    const groupsMap = new Map();

    for (const record of maintenanceRecords) {
      const instrumentId = record.instrument?.id;
      if (!instrumentId) continue;

      if (!groupsMap.has(instrumentId)) {
        groupsMap.set(instrumentId, {
          instrument: {
            id: record.instrument.instrumentId, // Use custom ID (INS-001)
            name: record.instrument.name,
            type: record.instrument.type,
            location: record.instrument.location,
            status: record.instrument.status,
          },
          records: [],
          statusSummary: {},
          totalRecords: 0,
          totalCost: 0,
        });
      }

      const group = groupsMap.get(instrumentId);
      
      // Add record to group
      group.records.push({
        id: record.id,
        date: record.date,
        type: record.type,
        description: record.description,
        performedBy: record.performedBy,
        status: record.status,
        cost: record.cost,
        equipment: record.equipment ? {
          id: record.equipment.equipmentId,
          name: record.equipment.name,
          type: record.equipment.type,
        } : null,
      });

      // Update summary stats
      group.totalRecords += 1;
      group.totalCost += record.cost || 0;

      // Update status summary
      const recordStatus = record.status || "Unknown";
      group.statusSummary[recordStatus] = (group.statusSummary[recordStatus] || 0) + 1;
    }

    // Convert map to array
    const groups = Array.from(groupsMap.values());

    // Calculate totals
    const totalGroups = groups.length;
    const totalRecords = maintenanceRecords.length;
    const totalCost = groups.reduce((sum, g) => sum + g.totalCost, 0);

    return {
      groups,
      totalGroups,
      totalRecords,
      totalCost,
    };
  }
};
