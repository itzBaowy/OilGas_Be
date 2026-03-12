import prisma from "../prisma/connect.prisma.js";
import { buildQueryPrisma } from "../common/helpers/build_query_prisma.js";
import {
  BadRequestException,
  NotFoundException,
} from "../common/helpers/exception.helper.js";
import {
  notifyOilThreshold,
  notifyOilDispatched,
  notifyOilTransferred,
} from "../common/helpers/notification.helper.js";
import { incidentService } from "./incident.service.js";
import { notificationService } from "./notification.service.js";
import { getIO } from "../common/socket/init.socket.js";

// Threshold constants (percentage of tankCapacity)
const OIL_THRESHOLD = {
  WARNING: 70,
  HIGH: 85,
  CRITICAL: 95,
};

const CONFIG_KEY = "INCIDENT_THRESHOLDS";
const DEFAULT_THRESHOLDS = {
  pressureLimit: 120,
  tempLimit: 90,
  criticalAlertThreshold: 3,
  pumpMaxRate: 200,
};

export const oilTransactionService = {
  // Generate custom transaction ID (OT-001, OT-002, etc.)
  async generateTransactionId() {
    const maxRetries = 10;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const updatedSequence = await prisma.sequence.upsert({
          where: { name: "oilTransaction" },
          update: { value: { increment: 1 } },
          create: { name: "oilTransaction", value: 1 },
        });

        const nextValue = updatedSequence.value;
        const transactionId = `OT-${String(nextValue).padStart(3, "0")}`;

        const existing = await prisma.oilTransaction.findUnique({
          where: { transactionId },
        });

        if (!existing) {
          return transactionId;
        }

        console.warn(
          `TransactionId ${transactionId} already exists, retrying...`
        );
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(
            `Failed to generate unique transaction ID after ${maxRetries} attempts: ${error.message}`
          );
        }
      }
    }

    throw new Error(
      `Failed to generate unique transaction ID after ${maxRetries} attempts`
    );
  },

  // Helper to find instrument by custom ID or ObjectId
  async findInstrument(identifier) {
    let instrument = null;

    if (identifier.match(/^INS-\d{3}$/)) {
      instrument = await prisma.instrument.findUnique({
        where: { instrumentId: identifier },
        include: { equipments: true },
      });
    } else if (identifier.length === 24) {
      try {
        instrument = await prisma.instrument.findUnique({
          where: { id: identifier },
          include: { equipments: true },
        });
      } catch {
        instrument = await prisma.instrument.findUnique({
          where: { instrumentId: identifier },
          include: { equipments: true },
        });
      }
    } else {
      instrument = await prisma.instrument.findUnique({
        where: { instrumentId: identifier },
        include: { equipments: true },
      });
    }

    return instrument;
  },

  // Helper to find warehouse by custom ID or ObjectId
  async findWarehouse(identifier) {
    let warehouse = null;

    if (identifier.match(/^WH-\d{3}$/)) {
      warehouse = await prisma.warehouse.findUnique({
        where: { warehouseId: identifier },
      });
    } else if (identifier.length === 24) {
      try {
        warehouse = await prisma.warehouse.findUnique({
          where: { id: identifier },
        });
      } catch {
        warehouse = await prisma.warehouse.findUnique({
          where: { warehouseId: identifier },
        });
      }
    } else {
      warehouse = await prisma.warehouse.findUnique({
        where: { warehouseId: identifier },
      });
    }

    return warehouse;
  },

  // Calculate alert level based on oil percentage
  getAlertLevel(percentage) {
    if (percentage >= OIL_THRESHOLD.CRITICAL) return "CRITICAL";
    if (percentage >= OIL_THRESHOLD.HIGH) return "HIGH";
    if (percentage >= OIL_THRESHOLD.WARNING) return "WARNING";
    return "NORMAL";
  },

  // ===== SIMULATE PUMP =====
  async simulatePump(data, user) {
    const { instrument_id, equipment_id, sensor_pressure, sensor_temperature, sensor_pump_rate, pump_volume } = data;

    if (!instrument_id || !equipment_id) throw new BadRequestException("instrument_id and equipment_id are required");
    if (!pump_volume || pump_volume <= 0) throw new BadRequestException("pump_volume must be greater than 0");

    const instrument = await this.findInstrument(instrument_id);
    if (!instrument) throw new NotFoundException("Instrument not found");
    if (instrument.isDeleted) throw new BadRequestException("Instrument has been deleted");
    if (instrument.status !== "Active") throw new BadRequestException(`Instrument "${instrument.name}" is ${instrument.status}. Only Active instruments can be simulated.`);
    if (!instrument.tankCapacity || instrument.tankCapacity <= 0) throw new BadRequestException(`Instrument "${instrument.name}" has no configured oil tank.`);

    let equipment = null;
    if (equipment_id.match(/^EQ-/)) {
      equipment = await prisma.equipment.findUnique({ where: { equipmentId: equipment_id } });
    } else {
      equipment = await prisma.equipment.findUnique({ where: { id: equipment_id } });
    }
    if (!equipment) throw new NotFoundException("Oil Pump equipment not found");
    if (equipment.type !== "Oil Pump") throw new BadRequestException(`Equipment "${equipment.name}" is not an Oil Pump.`);
    if (equipment.instrumentId !== instrument.id) throw new BadRequestException(`Oil Pump is not assigned to this instrument.`);
    if (equipment.status !== "Active") throw new BadRequestException(`Oil Pump "${equipment.name}" must be Active.`);

    // Load threshold config set by Admin
    const configRow = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    const thresholds = configRow ? JSON.parse(configRow.value) : DEFAULT_THRESHOLDS;
    const { pressureLimit, tempLimit, pumpMaxRate = 200 } = thresholds;

    // Pump oil into tank
    const currentVolume = instrument.currentOilVolume || 0;
    const tankCapacity = instrument.tankCapacity;
    const currentPct = (currentVolume / tankCapacity) * 100;

    if (currentPct >= OIL_THRESHOLD.CRITICAL) {
      throw new BadRequestException(`Oil tank of "${instrument.name}" is full (${currentPct.toFixed(1)}%). Cannot pump more oil.`);
    }

    const actualPumped = Math.min(pump_volume, tankCapacity - currentVolume);
    const newVolume = currentVolume + actualPumped;
    const newPct = (newVolume / tankCapacity) * 100;

    const updatedInstrument = await prisma.instrument.update({
      where: { id: instrument.id },
      data: { currentOilVolume: newVolume },
    });

    const transactionId = await this.generateTransactionId();
    const transaction = await prisma.oilTransaction.create({
      data: {
        transactionId,
        transactionType: "EXTRACTION",
        fromType: "INSTRUMENT",
        fromId: instrument.id,
        oilType: instrument.oilType || "Crude Oil - Brent",
        quantity: actualPumped,
        status: "COMPLETED",
        note: `[Simulator] Pumped ${actualPumped} L via ${equipment.name}`,
        createdBy: user.id,
      },
    });

    // Check sensor readings against thresholds
    const violations = [];
    if (sensor_pressure != null && sensor_pressure > pressureLimit) {
      violations.push({ type: "PRESSURE_ANOMALY", reading: sensor_pressure, limit: pressureLimit, label: "Pressure", unit: "psi" });
    }
    if (sensor_temperature != null && sensor_temperature > tempLimit) {
      violations.push({ type: "TEMPERATURE_ANOMALY", reading: sensor_temperature, limit: tempLimit, label: "Temperature", unit: "°C" });
    }
    if (sensor_pump_rate != null && sensor_pump_rate > pumpMaxRate) {
      violations.push({ type: "EQUIPMENT_FAILURE", reading: sensor_pump_rate, limit: pumpMaxRate, label: "Pump Rate", unit: "L/min" });
    }

    // Create incidents for new violations
    const createdIncidents = [];
    if (violations.length > 0) {
      const existingActive = await prisma.incident.findMany({
        where: { instrumentId: instrument.instrumentId, status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
        select: { type: true },
      });
      const activeTypes = new Set(existingActive.map((i) => i.type));

      for (const v of violations) {
        if (activeTypes.has(v.type)) continue;
        activeTypes.add(v.type);
        const ratio = v.reading / v.limit;
        const severity = ratio >= 1.5 ? "FATAL" : ratio >= 1.2 ? "CRITICAL" : "WARNING";

        const incident = await incidentService.createIncident(
          {
            instrumentId: instrument.instrumentId,
            instrumentName: instrument.name,
            type: v.type,
            severity,
            description: `[Simulator] ${v.label} ${v.reading} ${v.unit} exceeds threshold ${v.limit} ${v.unit} on equipment ${equipment.name} (${equipment.equipmentId}).`,
            currentReading: v.reading,
            threshold: v.limit,
          },
          { id: user.id, fullName: user.fullName || "Simulator" }
        );
        createdIncidents.push(incident);
      }

      if (createdIncidents.length > 0 && instrument.status !== "Maintenance" && instrument.status !== "Decommissioned") {
        await prisma.instrument.update({ where: { id: instrument.id }, data: { status: "Maintenance" } });
      }

      const recipients = await prisma.user.findMany({
        where: { role: { name: { in: ["Supervisor", "Engineer", "Admin"] } }, isActive: true },
        select: { id: true },
      });
      const recipientIds = recipients.map((u) => u.id);

      if (recipientIds.length > 0 && createdIncidents.length > 0) {
        await notificationService.createBulkNotifications({
          recipientIds,
          title: "🚨 Simulator Threshold Alert",
          message: `Oil Pump Simulator detected ${createdIncidents.length} violation(s) on "${instrument.name}" (${instrument.instrumentId}). Incident(s) created — review required in Action Approval.`,
          type: "ERROR",
          category: "INCIDENT",
          relatedId: createdIncidents[0].id,
          link: "/action-approval",
          createdBy: user.id,
        });
      }
    }

    // Emit real-time socket events
    const io = getIO();
    if (io) {
      io.emit("simulator:tank_update", {
        instrumentId: instrument.instrumentId,
        instrumentObjectId: instrument.id,
        instrumentName: instrument.name,
        currentOilVolume: newVolume,
        tankCapacity,
        percentage: Math.round(newPct * 10) / 10,
        pumpedVolume: actualPumped,
        timestamp: new Date().toISOString(),
      });

      if (createdIncidents.length > 0) {
        io.emit("simulator:incident_created", {
          incidents: createdIncidents.map((inc) => ({
            id: inc.id,
            incidentId: inc.incidentId,
            instrumentId: inc.instrumentId,
            instrumentName: inc.instrumentName,
            type: inc.type,
            severity: inc.severity,
            status: inc.status,
            description: inc.description,
            currentReading: inc.currentReading,
            threshold: inc.threshold,
            createdAt: inc.createdAt,
          })),
          instrumentId: instrument.instrumentId,
          triggeredBy: user.fullName || "Simulator",
          timestamp: new Date().toISOString(),
        });
      }
    }

    const alertLevel = this.getAlertLevel(newPct);
    if (alertLevel !== "NORMAL") {
      await notifyOilThreshold(user.id, instrument, newVolume, tankCapacity, newPct, alertLevel);
    }

    return {
      instrument: {
        id: updatedInstrument.id,
        instrumentId: updatedInstrument.instrumentId,
        name: updatedInstrument.name,
        tankCapacity: updatedInstrument.tankCapacity,
        currentOilVolume: updatedInstrument.currentOilVolume,
        percentage: Math.round(newPct * 10) / 10,
        alertLevel,
      },
      transaction,
      pump: { pumpedVolume: actualPumped, requestedVolume: pump_volume, previousVolume: currentVolume, newVolume },
      thresholdCheck: {
        thresholds: { pressureLimit, tempLimit, pumpMaxRate },
        violations: violations.map((v) => ({ type: v.type, reading: v.reading, limit: v.limit, label: v.label, unit: v.unit })),
        incidentsCreated: createdIncidents.length,
        incidents: createdIncidents.map((inc) => ({ id: inc.id, incidentId: inc.incidentId, type: inc.type, severity: inc.severity })),
      },
    };
  },

  // ===== EXTRACT OIL =====
  async extractOil(data, userId) {
    const { instrument_id, equipment_id } = data;

    if (!instrument_id || !equipment_id) {
      throw new BadRequestException(
        "instrument_id and equipment_id are required"
      );
    }

    // Find instrument
    const instrument = await this.findInstrument(instrument_id);
    if (!instrument) {
      throw new NotFoundException("Instrument not found");
    }
    if (instrument.isDeleted) {
      throw new BadRequestException("Instrument has been deleted");
    }
    if (instrument.status !== "Active") {
      throw new BadRequestException(
        `Instrument "${instrument.name}" is currently ${instrument.status}. Only Active instruments can extract oil.`
      );
    }
    if (!instrument.tankCapacity || instrument.tankCapacity <= 0) {
      throw new BadRequestException(
        `Instrument "${instrument.name}" does not have a configured oil tank.`
      );
    }

    // Find equipment (Oil Pump)
    let equipment = null;
    if (equipment_id.match(/^EQ-/)) {
      equipment = await prisma.equipment.findUnique({
        where: { equipmentId: equipment_id },
      });
    } else if (equipment_id.length === 24) {
      try {
        equipment = await prisma.equipment.findUnique({
          where: { id: equipment_id },
        });
      } catch {
        equipment = await prisma.equipment.findUnique({
          where: { equipmentId: equipment_id },
        });
      }
    }

    if (!equipment) {
      throw new NotFoundException("Oil Pump equipment not found");
    }
    if (equipment.type !== "Oil Pump") {
      throw new BadRequestException(
        `Equipment "${equipment.name}" is not an Oil Pump. Type: ${equipment.type}`
      );
    }
    if (equipment.instrumentId !== instrument.id) {
      throw new BadRequestException(
        `Oil Pump "${equipment.name}" does not belong to instrument "${instrument.name}"`
      );
    }
    if (equipment.status !== "Active") {
      throw new BadRequestException(
        `Oil Pump "${equipment.name}" is currently ${equipment.status}. Must be Active to extract oil.`
      );
    }

    // Get extraction rate from specifications
    const extractionRate = equipment.specifications?.extractionRate || 500;
    const currentVolume = instrument.currentOilVolume || 0;
    const tankCapacity = instrument.tankCapacity;

    // Check if tank is already full (>= 95%)
    const currentPercentage = (currentVolume / tankCapacity) * 100;
    if (currentPercentage >= OIL_THRESHOLD.CRITICAL) {
      throw new BadRequestException(
        `Oil tank of "${instrument.name}" is full (${currentPercentage.toFixed(1)}%). ` +
          `Cannot extract more oil. Please dispatch oil to a warehouse first.`
      );
    }

    // Calculate actual extraction amount (cap at tank capacity)
    const actualExtracted = Math.min(extractionRate, tankCapacity - currentVolume);
    const newVolume = currentVolume + actualExtracted;
    const newPercentage = (newVolume / tankCapacity) * 100;

    // Update instrument oil volume
    const updatedInstrument = await prisma.instrument.update({
      where: { id: instrument.id },
      data: { currentOilVolume: newVolume },
    });

    // Create transaction record
    const transactionId = await this.generateTransactionId();
    const transaction = await prisma.oilTransaction.create({
      data: {
        transactionId,
        transactionType: "EXTRACTION",
        fromType: "INSTRUMENT",
        fromId: instrument.id,
        oilType: instrument.oilType || "Crude Oil - Brent",
        quantity: actualExtracted,
        status: "COMPLETED",
        note: `Extracted ${actualExtracted} liters using ${equipment.name}`,
        createdBy: userId,
      },
    });

    // Check threshold and send notification
    const alertLevel = this.getAlertLevel(newPercentage);
    if (alertLevel !== "NORMAL") {
      await notifyOilThreshold(
        userId,
        instrument,
        newVolume,
        tankCapacity,
        newPercentage,
        alertLevel
      );
    }

    return {
      instrument: {
        id: updatedInstrument.id,
        instrumentId: updatedInstrument.instrumentId,
        name: updatedInstrument.name,
        tankCapacity: updatedInstrument.tankCapacity,
        currentOilVolume: updatedInstrument.currentOilVolume,
        oilType: updatedInstrument.oilType,
      },
      transaction,
      extraction: {
        extracted: actualExtracted,
        extractionRate,
        previousVolume: currentVolume,
        newVolume,
        percentage: Math.round(newPercentage * 10) / 10,
        alertLevel,
      },
    };
  },

  // ===== DISPATCH OIL (Instrument → Warehouse) =====
  async dispatchOil(data, userId) {
    const {
      instrument_id,
      warehouse_id,
      quantity,
      transport_method,
      note,
    } = data;

    // Validate required fields
    if (!instrument_id || !warehouse_id || !quantity) {
      throw new BadRequestException(
        "instrument_id, warehouse_id, and quantity are required"
      );
    }

    if (quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than 0");
    }

    // Find instrument
    const instrument = await this.findInstrument(instrument_id);
    if (!instrument) {
      throw new NotFoundException("Instrument not found");
    }
    if (instrument.status !== "Active") {
      throw new BadRequestException(
        `Instrument "${instrument.name}" is currently ${instrument.status}.`
      );
    }

    const currentVolume = instrument.currentOilVolume || 0;
    if (quantity > currentVolume) {
      throw new BadRequestException(
        `Insufficient oil. Available: ${currentVolume} liters, Requested: ${quantity} liters.`
      );
    }

    // Find warehouse
    const warehouse = await this.findWarehouse(warehouse_id);
    if (!warehouse) {
      throw new NotFoundException("Warehouse not found");
    }
    if (warehouse.status === "MAINTENANCE") {
      throw new BadRequestException(
        `Warehouse "${warehouse.name}" is under MAINTENANCE and cannot receive oil.`
      );
    }

    // Check warehouse oil capacity
    const warehouseCurrentOil = warehouse.currentOilVolume || 0;
    const warehouseOilCapacity = warehouse.oilCapacity || 50000;
    if (warehouseCurrentOil + quantity > warehouseOilCapacity) {
      const available = warehouseOilCapacity - warehouseCurrentOil;
      throw new BadRequestException(
        `Warehouse "${warehouse.name}" oil capacity exceeded. ` +
          `Available space: ${available} liters, Requested: ${quantity} liters.`
      );
    }

    // Generate transaction ID before atomic operation
    const transactionId = await this.generateTransactionId();

    // Perform all DB writes atomically
    const [updatedInstrument, updatedWarehouse, transaction] = await prisma.$transaction([
      prisma.instrument.update({
        where: { id: instrument.id },
        data: { currentOilVolume: currentVolume - quantity },
      }),
      prisma.warehouse.update({
        where: { id: warehouse.id },
        data: { currentOilVolume: warehouseCurrentOil + quantity },
      }),
      prisma.oilTransaction.create({
        data: {
          transactionId,
          transactionType: "INSTRUMENT_TO_WAREHOUSE",
          fromType: "INSTRUMENT",
          fromId: instrument.id,
          toType: "WAREHOUSE",
          toId: warehouse.id,
          oilType: instrument.oilType || "Crude Oil - Brent",
          quantity,
          transportMethod: transport_method || null,
          status: "COMPLETED",
          note: note || `Dispatched ${quantity} liters from ${instrument.name} to ${warehouse.name}`,
          createdBy: userId,
        },
      }),
    ]);

    // Send notification
    await notifyOilDispatched(
      userId,
      instrument,
      warehouse,
      quantity,
      updatedInstrument.currentOilVolume,
      updatedWarehouse.currentOilVolume
    );

    return {
      instrument: {
        id: updatedInstrument.id,
        instrumentId: updatedInstrument.instrumentId,
        name: updatedInstrument.name,
        tankCapacity: updatedInstrument.tankCapacity,
        currentOilVolume: updatedInstrument.currentOilVolume,
        oilType: updatedInstrument.oilType,
      },
      warehouse: {
        id: updatedWarehouse.id,
        warehouseId: updatedWarehouse.warehouseId,
        name: updatedWarehouse.name,
        oilCapacity: updatedWarehouse.oilCapacity,
        currentOilVolume: updatedWarehouse.currentOilVolume,
      },
      transaction,
    };
  },

  // ===== TRANSFER OIL (Warehouse → Warehouse) =====
  async transferOil(data, userId) {
    const {
      from_warehouse_id,
      to_warehouse_id,
      quantity,
      oil_type,
      transport_method,
      note,
    } = data;

    // Validate required fields
    if (!from_warehouse_id || !to_warehouse_id || !quantity) {
      throw new BadRequestException(
        "from_warehouse_id, to_warehouse_id, and quantity are required"
      );
    }

    if (quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than 0");
    }

    if (from_warehouse_id === to_warehouse_id) {
      throw new BadRequestException(
        "Source and destination warehouses must be different"
      );
    }

    // Find source warehouse
    const fromWarehouse = await this.findWarehouse(from_warehouse_id);
    if (!fromWarehouse) {
      throw new NotFoundException("Source warehouse not found");
    }
    if (fromWarehouse.status === "MAINTENANCE") {
      throw new BadRequestException(
        `Source warehouse "${fromWarehouse.name}" is under MAINTENANCE.`
      );
    }

    const fromCurrentOil = fromWarehouse.currentOilVolume || 0;
    if (quantity > fromCurrentOil) {
      throw new BadRequestException(
        `Insufficient oil in "${fromWarehouse.name}". ` +
          `Available: ${fromCurrentOil} liters, Requested: ${quantity} liters.`
      );
    }

    // Find destination warehouse
    const toWarehouse = await this.findWarehouse(to_warehouse_id);
    if (!toWarehouse) {
      throw new NotFoundException("Destination warehouse not found");
    }
    if (toWarehouse.status === "MAINTENANCE") {
      throw new BadRequestException(
        `Destination warehouse "${toWarehouse.name}" is under MAINTENANCE.`
      );
    }

    const toCurrentOil = toWarehouse.currentOilVolume || 0;
    const toOilCapacity = toWarehouse.oilCapacity || 50000;
    if (toCurrentOil + quantity > toOilCapacity) {
      const available = toOilCapacity - toCurrentOil;
      throw new BadRequestException(
        `Destination warehouse "${toWarehouse.name}" oil capacity exceeded. ` +
          `Available space: ${available} liters, Requested: ${quantity} liters.`
      );
    }

    // Generate transaction ID before atomic operation
    const transactionId = await this.generateTransactionId();

    // Perform all DB writes atomically
    const [updatedFromWarehouse, updatedToWarehouse, transaction] = await prisma.$transaction([
      prisma.warehouse.update({
        where: { id: fromWarehouse.id },
        data: { currentOilVolume: fromCurrentOil - quantity },
      }),
      prisma.warehouse.update({
        where: { id: toWarehouse.id },
        data: { currentOilVolume: toCurrentOil + quantity },
      }),
      prisma.oilTransaction.create({
        data: {
          transactionId,
          transactionType: "WAREHOUSE_TO_WAREHOUSE",
          fromType: "WAREHOUSE",
          fromId: fromWarehouse.id,
          toType: "WAREHOUSE",
          toId: toWarehouse.id,
          oilType: oil_type || "Crude Oil - Brent",
          quantity,
          transportMethod: transport_method || null,
          status: "COMPLETED",
          note: note || `Transferred ${quantity} liters from ${fromWarehouse.name} to ${toWarehouse.name}`,
          createdBy: userId,
        },
      }),
    ]);

    // Send notifications
    await notifyOilTransferred(
      userId,
      fromWarehouse,
      toWarehouse,
      quantity,
      updatedFromWarehouse.currentOilVolume,
      updatedToWarehouse.currentOilVolume
    );

    return {
      fromWarehouse: {
        id: updatedFromWarehouse.id,
        warehouseId: updatedFromWarehouse.warehouseId,
        name: updatedFromWarehouse.name,
        oilCapacity: updatedFromWarehouse.oilCapacity,
        currentOilVolume: updatedFromWarehouse.currentOilVolume,
      },
      toWarehouse: {
        id: updatedToWarehouse.id,
        warehouseId: updatedToWarehouse.warehouseId,
        name: updatedToWarehouse.name,
        oilCapacity: updatedToWarehouse.oilCapacity,
        currentOilVolume: updatedToWarehouse.currentOilVolume,
      },
      transaction,
    };
  },

  // ===== GET ALL TRANSACTIONS =====
  async getAllTransactions(req) {
    const { page, pageSize, index } = buildQueryPrisma(req.query);

    // Build filter
    const where = {};

    if (req.query.transaction_type) {
      where.transactionType = req.query.transaction_type;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.from_date || req.query.to_date) {
      where.createdAt = {};
      if (req.query.from_date) {
        where.createdAt.gte = new Date(req.query.from_date);
      }
      if (req.query.to_date) {
        where.createdAt.lte = new Date(req.query.to_date + "T23:59:59.999Z");
      }
    }

    if (req.query.oil_type) {
      where.oilType = { contains: req.query.oil_type, mode: "insensitive" };
    }

    const [transactions, totalItem] = await Promise.all([
      prisma.oilTransaction.findMany({
        where,
        skip: index,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.oilTransaction.count({ where }),
    ]);

    // Enrich transactions with entity names
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        let fromName = "";
        let toName = "";

        if (tx.fromType === "INSTRUMENT") {
          const inst = await prisma.instrument.findUnique({
            where: { id: tx.fromId },
            select: { name: true, instrumentId: true },
          });
          fromName = inst ? `${inst.name} (${inst.instrumentId})` : tx.fromId;
        } else if (tx.fromType === "WAREHOUSE") {
          const wh = await prisma.warehouse.findUnique({
            where: { id: tx.fromId },
            select: { name: true, warehouseId: true },
          });
          fromName = wh ? `${wh.name} (${wh.warehouseId})` : tx.fromId;
        }

        if (tx.toType === "WAREHOUSE" && tx.toId) {
          const wh = await prisma.warehouse.findUnique({
            where: { id: tx.toId },
            select: { name: true, warehouseId: true },
          });
          toName = wh ? `${wh.name} (${wh.warehouseId})` : tx.toId;
        }

        return { ...tx, fromName, toName };
      })
    );

    return {
      page,
      pageSize,
      totalItem,
      totalPage: Math.ceil(totalItem / pageSize),
      items: enrichedTransactions,
    };
  },

  // ===== GET TRANSACTION BY ID =====
  async getTransactionById(transactionId) {
    let transaction = null;

    if (transactionId.match(/^OT-\d{3}$/)) {
      transaction = await prisma.oilTransaction.findUnique({
        where: { transactionId },
      });
    } else if (transactionId.length === 24) {
      try {
        transaction = await prisma.oilTransaction.findUnique({
          where: { id: transactionId },
        });
      } catch {
        transaction = await prisma.oilTransaction.findUnique({
          where: { transactionId },
        });
      }
    }

    if (!transaction) {
      throw new NotFoundException("Oil transaction not found");
    }

    return transaction;
  },

  // ===== GET OIL SUMMARY =====
  async getOilSummary() {
    // Get all instruments with oil data
    const instruments = await prisma.instrument.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        instrumentId: true,
        name: true,
        status: true,
        tankCapacity: true,
        currentOilVolume: true,
        oilType: true,
        equipments: {
          where: { type: "Oil Pump", isDeleted: false },
          select: {
            id: true,
            equipmentId: true,
            name: true,
            status: true,
            specifications: true,
          },
        },
      },
      orderBy: { instrumentId: "asc" },
    });

    // Get all warehouses with oil data
    const warehouses = await prisma.warehouse.findMany({
      select: {
        id: true,
        warehouseId: true,
        name: true,
        status: true,
        oilCapacity: true,
        currentOilVolume: true,
      },
      orderBy: { warehouseId: "asc" },
    });

    // Calculate totals
    const totalOilInInstruments = instruments.reduce(
      (sum, i) => sum + (i.currentOilVolume || 0),
      0
    );
    const totalOilInWarehouses = warehouses.reduce(
      (sum, w) => sum + (w.currentOilVolume || 0),
      0
    );

    // Get recent transactions
    const recentTransactions = await prisma.oilTransaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // Get transaction stats
    const transactionCount = await prisma.oilTransaction.count();

    return {
      totalOilInSystem: totalOilInInstruments + totalOilInWarehouses,
      totalOilInInstruments,
      totalOilInWarehouses,
      transactionCount,
      instruments: instruments.map((i) => ({
        ...i,
        percentage: i.tankCapacity
          ? Math.round(((i.currentOilVolume || 0) / i.tankCapacity) * 1000) / 10
          : 0,
        alertLevel: i.tankCapacity
          ? this.getAlertLevel(((i.currentOilVolume || 0) / i.tankCapacity) * 100)
          : "NORMAL",
      })),
      warehouses: warehouses.map((w) => ({
        ...w,
        percentage: w.oilCapacity
          ? Math.round(((w.currentOilVolume || 0) / w.oilCapacity) * 1000) / 10
          : 0,
      })),
      recentTransactions,
    };
  },

  // ===== GET UNASSIGNED OIL PUMPS =====
  async getUnassignedOilPumps() {
    const pumps = await prisma.equipment.findMany({
      where: {
        type: "Oil Pump",
        isDeleted: false,
        OR: [
          { instrumentId: null },
          { instrumentId: { isSet: false } },
        ],
      },
      select: {
        id: true,
        equipmentId: true,
        name: true,
        status: true,
        specifications: true,
      },
      orderBy: { equipmentId: "asc" },
    });
    return pumps;
  },

  // ===== ASSIGN OIL PUMP TO INSTRUMENT =====
  async assignOilPump(data) {
    const { equipment_id, instrument_id } = data;

    if (!equipment_id || !instrument_id) {
      throw new BadRequestException("equipment_id and instrument_id are required");
    }

    // Find equipment
    let equipment = null;
    if (equipment_id.match(/^EQ-/)) {
      equipment = await prisma.equipment.findUnique({ where: { equipmentId: equipment_id } });
    } else {
      equipment = await prisma.equipment.findUnique({ where: { id: equipment_id } });
    }

    if (!equipment || equipment.isDeleted) {
      throw new NotFoundException("Oil Pump equipment not found");
    }
    if (equipment.type !== "Oil Pump") {
      throw new BadRequestException(`Equipment "${equipment.name}" is not an Oil Pump.`);
    }
    if (equipment.instrumentId) {
      throw new BadRequestException(`Oil Pump "${equipment.name}" is already assigned to an instrument.`);
    }

    // Find instrument
    const instrument = await this.findInstrument(instrument_id);
    if (!instrument) {
      throw new NotFoundException("Instrument not found");
    }
    if (instrument.isDeleted) {
      throw new BadRequestException("Instrument has been deleted");
    }

    // Check if instrument already has an Oil Pump
    const existingPump = await prisma.equipment.findFirst({
      where: {
        type: "Oil Pump",
        instrumentId: instrument.id,
        isDeleted: false,
      },
    });
    if (existingPump) {
      throw new BadRequestException(
        `Instrument "${instrument.name}" already has Oil Pump "${existingPump.name}" assigned.`
      );
    }

    // Assign pump to instrument
    const updatedEquipment = await prisma.equipment.update({
      where: { id: equipment.id },
      data: { instrumentId: instrument.id },
    });

    return {
      equipment: {
        id: updatedEquipment.id,
        equipmentId: updatedEquipment.equipmentId,
        name: updatedEquipment.name,
        status: updatedEquipment.status,
      },
      instrument: {
        id: instrument.id,
        instrumentId: instrument.instrumentId,
        name: instrument.name,
      },
    };
  },

  // ===== UNASSIGN OIL PUMP FROM INSTRUMENT =====
  async unassignOilPump(equipmentIdentifier) {
    let equipment = null;
    if (equipmentIdentifier.match(/^EQ-/)) {
      equipment = await prisma.equipment.findUnique({ where: { equipmentId: equipmentIdentifier } });
    } else {
      equipment = await prisma.equipment.findUnique({ where: { id: equipmentIdentifier } });
    }

    if (!equipment || equipment.isDeleted) {
      throw new NotFoundException("Oil Pump equipment not found");
    }
    if (equipment.type !== "Oil Pump") {
      throw new BadRequestException(`Equipment "${equipment.name}" is not an Oil Pump.`);
    }
    if (!equipment.instrumentId) {
      throw new BadRequestException(`Oil Pump "${equipment.name}" is not assigned to any instrument.`);
    }

    const updatedEquipment = await prisma.equipment.update({
      where: { id: equipment.id },
      data: { instrumentId: null },
    });

    return {
      equipment: {
        id: updatedEquipment.id,
        equipmentId: updatedEquipment.equipmentId,
        name: updatedEquipment.name,
      },
    };
  },

  // ===== START AUTO-EXTRACT =====
  async startAutoExtract(data) {
    const { equipment_id, instrument_id } = data;

    if (!equipment_id || !instrument_id) {
      throw new BadRequestException("equipment_id and instrument_id are required");
    }

    const instrument = await this.findInstrument(instrument_id);
    if (!instrument) throw new NotFoundException("Instrument not found");
    if (instrument.status !== "Active") {
      throw new BadRequestException(`Instrument "${instrument.name}" is not Active.`);
    }

    let equipment = null;
    if (equipment_id.match(/^EQ-/)) {
      equipment = await prisma.equipment.findUnique({ where: { equipmentId: equipment_id } });
    } else {
      equipment = await prisma.equipment.findUnique({ where: { id: equipment_id } });
    }

    if (!equipment) throw new NotFoundException("Oil Pump not found");
    if (equipment.type !== "Oil Pump") {
      throw new BadRequestException(`Equipment "${equipment.name}" is not an Oil Pump.`);
    }
    if (equipment.instrumentId !== instrument.id) {
      throw new BadRequestException(`Oil Pump does not belong to this instrument.`);
    }
    if (equipment.status !== "Active") {
      throw new BadRequestException(`Oil Pump "${equipment.name}" must be Active.`);
    }

    const currentPercent = ((instrument.currentOilVolume || 0) / (instrument.tankCapacity || 1)) * 100;
    if (currentPercent >= OIL_THRESHOLD.CRITICAL) {
      throw new BadRequestException(`Tank is full (${currentPercent.toFixed(1)}%). Cannot start auto-extract.`);
    }

    if (equipment.isAutoExtracting) {
      throw new BadRequestException(`Oil Pump "${equipment.name}" is already auto-extracting.`);
    }

    const updated = await prisma.equipment.update({
      where: { id: equipment.id },
      data: { isAutoExtracting: true, autoExtractStartedAt: new Date() },
    });

    return {
      equipment: {
        id: updated.id,
        equipmentId: updated.equipmentId,
        name: updated.name,
        isAutoExtracting: updated.isAutoExtracting,
        autoExtractStartedAt: updated.autoExtractStartedAt,
        extractionRate: updated.specifications?.extractionRate || 500,
      },
      instrument: {
        instrumentId: instrument.instrumentId,
        name: instrument.name,
        currentOilVolume: instrument.currentOilVolume,
        tankCapacity: instrument.tankCapacity,
      },
    };
  },

  // ===== STOP AUTO-EXTRACT =====
  async stopAutoExtract(data) {
    const { equipment_id } = data;

    if (!equipment_id) {
      throw new BadRequestException("equipment_id is required");
    }

    let equipment = null;
    if (equipment_id.match(/^EQ-/)) {
      equipment = await prisma.equipment.findUnique({ where: { equipmentId: equipment_id } });
    } else {
      equipment = await prisma.equipment.findUnique({ where: { id: equipment_id } });
    }

    if (!equipment) throw new NotFoundException("Oil Pump not found");

    if (!equipment.isAutoExtracting) {
      throw new BadRequestException(`Oil Pump "${equipment.name}" is not auto-extracting.`);
    }

    const updated = await prisma.equipment.update({
      where: { id: equipment.id },
      data: { isAutoExtracting: false, autoExtractStartedAt: null },
    });

    return {
      equipment: {
        id: updated.id,
        equipmentId: updated.equipmentId,
        name: updated.name,
        isAutoExtracting: updated.isAutoExtracting,
      },
    };
  },

  // ===== GET AUTO-EXTRACT STATUS =====
  async getAutoExtractStatus(instrumentIdentifier) {
    const instrument = await this.findInstrument(instrumentIdentifier);
    if (!instrument) throw new NotFoundException("Instrument not found");

    const pump = await prisma.equipment.findFirst({
      where: {
        type: "Oil Pump",
        instrumentId: instrument.id,
        isDeleted: false,
      },
    });

    return {
      instrument: {
        instrumentId: instrument.instrumentId,
        name: instrument.name,
        currentOilVolume: instrument.currentOilVolume || 0,
        tankCapacity: instrument.tankCapacity || 0,
      },
      pump: pump ? {
        equipmentId: pump.equipmentId,
        name: pump.name,
        status: pump.status,
        isAutoExtracting: pump.isAutoExtracting || false,
        autoExtractStartedAt: pump.autoExtractStartedAt,
        extractionRate: pump.specifications?.extractionRate || 500,
      } : null,
    };
  },
};
