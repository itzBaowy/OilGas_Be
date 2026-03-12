import prisma from "../prisma/connect.prisma.js";
import { getIO } from "../common/socket/init.socket.js";

const OIL_THRESHOLD = { WARNING: 70, HIGH: 85, CRITICAL: 95 };
const TICK_INTERVAL_MS = 5000;
const TICK_INTERVAL_SEC = TICK_INTERVAL_MS / 1000;

let intervalId = null;
let isTickRunning = false;

function getAlertLevel(percentage) {
  if (percentage >= OIL_THRESHOLD.CRITICAL) return "CRITICAL";
  if (percentage >= OIL_THRESHOLD.HIGH) return "HIGH";
  if (percentage >= OIL_THRESHOLD.WARNING) return "WARNING";
  return "NORMAL";
}

function emitTankUpdate(io, inst, newVolume, tankCapacity, pumpedVolume) {
  const newPercent = (newVolume / tankCapacity) * 100;
  io.emit("simulator:tank_update", {
    instrumentId: inst.instrumentId,
    instrumentObjectId: inst.id,
    instrumentName: inst.name,
    currentOilVolume: Math.round(newVolume * 100) / 100,
    tankCapacity,
    percentage: Math.round(newPercent * 10) / 10,
    pumpedVolume: Math.round(pumpedVolume * 100) / 100,
    timestamp: new Date().toISOString(),
  });
}

async function stopPumpAndNotify(io, pump, inst, reason) {
  await prisma.equipment.update({
    where: { id: pump.id },
    data: { isAutoExtracting: false, autoExtractStartedAt: null },
  });

  if (!io) return;

  // Always emit the generic stop event (for any listener)
  io.emit("oil:auto_extract_stopped", {
    equipmentId: pump.equipmentId,
    instrumentId: inst.instrumentId,
    reason,
    timestamp: new Date().toISOString(),
  });

  if (reason === "MAINTENANCE") {
    // Fetch active incidents for this instrument so the simulator panel can show them
    const activeIncidents = await prisma.incident.findMany({
      where: {
        instrumentId: inst.instrumentId,
        status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        incidentId: true,
        instrumentId: true,
        instrumentName: true,
        type: true,
        severity: true,
        status: true,
        description: true,
        currentReading: true,
        threshold: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (activeIncidents.length > 0) {
      // Emit same event shape as simulate-pump so SimulatorIncidentAlert renders correctly
      io.emit("simulator:incident_created", {
        incidents: activeIncidents,
        instrumentId: inst.instrumentId,
        triggeredBy: "Auto-Extract Engine",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

async function tick() {
  if (isTickRunning) return;
  isTickRunning = true;
  try {
    const pumps = await prisma.equipment.findMany({
      where: {
        isAutoExtracting: true,
        isDeleted: false,
        status: "Active",
        type: "Oil Pump",
        instrumentId: { not: null },
      },
      include: {
        instrument: {
          select: {
            id: true,
            instrumentId: true,
            name: true,
            tankCapacity: true,
            currentOilVolume: true,
            oilType: true,
            status: true,
            isDeleted: true,
          },
        },
      },
    });

    if (pumps.length === 0) return;

    const io = getIO();
    const volumeUpdates = [];

    for (const pump of pumps) {
      const inst = pump.instrument;

      // Instrument deleted or not Active
      if (!inst || inst.isDeleted) {
        await prisma.equipment.update({
          where: { id: pump.id },
          data: { isAutoExtracting: false, autoExtractStartedAt: null },
        });
        continue;
      }

      // Instrument is in Maintenance → an incident was created → stop pump and show alert
      if (inst.status !== "Active") {
        await stopPumpAndNotify(io, pump, inst, "MAINTENANCE");
        continue;
      }

      const tankCapacity = inst.tankCapacity || 0;
      if (tankCapacity <= 0) continue;

      const currentVolume = inst.currentOilVolume || 0;
      const currentPercent = (currentVolume / tankCapacity) * 100;

      // Tank already full before this tick
      if (currentPercent >= OIL_THRESHOLD.CRITICAL) {
        await stopPumpAndNotify(io, pump, inst, "TANK_FULL");
        continue;
      }

      // Calculate extraction for this tick
      const extractionRate = pump.specifications?.extractionRate || 500;
      const extractedPerTick = (extractionRate / 60) * TICK_INTERVAL_SEC;
      const remaining = tankCapacity - currentVolume;
      const actualExtracted = Math.min(extractedPerTick, remaining);

      if (actualExtracted <= 0) continue;

      // Atomic increment to avoid race conditions
      const updatedInstrument = await prisma.instrument.update({
        where: { id: inst.id },
        data: { currentOilVolume: { increment: actualExtracted } },
        select: { currentOilVolume: true },
      });

      let newVolume = updatedInstrument.currentOilVolume;

      // Cap at tank capacity
      if (newVolume > tankCapacity) {
        newVolume = tankCapacity;
        await prisma.instrument.update({
          where: { id: inst.id },
          data: { currentOilVolume: tankCapacity },
        });
      }

      const newPercent = (newVolume / tankCapacity) * 100;

      // Emit simulator:tank_update so the Simulator page tank bar updates
      if (io) emitTankUpdate(io, inst, newVolume, tankCapacity, actualExtracted);

      // Tank reached CRITICAL after this tick → stop
      if (newPercent >= OIL_THRESHOLD.CRITICAL) {
        await stopPumpAndNotify(io, pump, inst, "TANK_FULL");
      }

      volumeUpdates.push({
        instrumentId: inst.instrumentId,
        instrumentDbId: inst.id,
        instrumentName: inst.name,
        equipmentId: pump.equipmentId,
        pumpName: pump.name,
        extracted: Math.round(actualExtracted * 100) / 100,
        extractionRate,
        currentVolume: Math.round(newVolume * 100) / 100,
        tankCapacity,
        percentage: Math.round(newPercent * 10) / 10,
        alertLevel: getAlertLevel(newPercent),
      });
    }

    // Also emit the batched oil:volume_update for any other listeners (dashboards, etc.)
    if (io && volumeUpdates.length > 0) {
      io.emit("oil:volume_update", { updates: volumeUpdates, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error("[AutoExtract] tick error:", err.message);
  } finally {
    isTickRunning = false;
  }
}

export function startAutoExtractEngine() {
  if (intervalId) return;
  intervalId = setInterval(tick, TICK_INTERVAL_MS);
  console.log(`⛽ Auto-Extract Engine started (tick every ${TICK_INTERVAL_SEC}s)`);
}

export function stopAutoExtractEngine() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("⛽ Auto-Extract Engine stopped");
  }
}
