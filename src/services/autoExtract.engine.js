import prisma from "../prisma/connect.prisma.js";
import { getIO } from "../common/socket/init.socket.js";

const OIL_THRESHOLD = { WARNING: 70, HIGH: 85, CRITICAL: 95 };
const TICK_INTERVAL_MS = 5000; // 5 seconds between ticks
const TICK_INTERVAL_SEC = TICK_INTERVAL_MS / 1000;

let intervalId = null;
let isTickRunning = false;

/**
 * Auto-Extract Engine
 * Runs every 5 seconds, finds all oil pumps with isAutoExtracting=true,
 * calculates oil extracted based on extractionRate (L/min) and time elapsed,
 * updates DB, and emits socket events for real-time UI updates.
 */
async function tick() {
  if (isTickRunning) return; // Prevent overlapping ticks
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
    const updates = [];

    for (const pump of pumps) {
      const inst = pump.instrument;
      if (!inst || inst.isDeleted || inst.status !== "Active") {
        // Stop pumps on invalid instruments
        await prisma.equipment.update({
          where: { id: pump.id },
          data: { isAutoExtracting: false, autoExtractStartedAt: null },
        });
        continue;
      }

      const tankCapacity = inst.tankCapacity || 0;
      if (tankCapacity <= 0) continue;

      const currentVolume = inst.currentOilVolume || 0;
      const currentPercent = (currentVolume / tankCapacity) * 100;

      // Stop if tank is full (>= 95%)
      if (currentPercent >= OIL_THRESHOLD.CRITICAL) {
        await prisma.equipment.update({
          where: { id: pump.id },
          data: { isAutoExtracting: false, autoExtractStartedAt: null },
        });

        if (io) {
          io.emit("oil:auto_extract_stopped", {
            equipmentId: pump.equipmentId,
            instrumentId: inst.instrumentId,
            reason: "TANK_FULL",
            currentVolume,
            tankCapacity,
            percentage: Math.round(currentPercent * 10) / 10,
          });
        }
        continue;
      }

      // Calculate extraction: rate is L/min, tick is every 5s
      const extractionRate = pump.specifications?.extractionRate || 500;
      const extractedPerTick = (extractionRate / 60) * TICK_INTERVAL_SEC;
      const remaining = tankCapacity - currentVolume;
      const actualExtracted = Math.min(extractedPerTick, remaining);

      if (actualExtracted <= 0) continue;

      // Use atomic increment to avoid race conditions with dispatch/receive
      const updatedInstrument = await prisma.instrument.update({
        where: { id: inst.id },
        data: { currentOilVolume: { increment: actualExtracted } },
        select: { currentOilVolume: true },
      });

      // Re-read actual volume after atomic update (accounts for concurrent dispatch)
      let newVolume = updatedInstrument.currentOilVolume;

      // Cap at tank capacity if somehow exceeded
      if (newVolume > tankCapacity) {
        newVolume = tankCapacity;
        await prisma.instrument.update({
          where: { id: inst.id },
          data: { currentOilVolume: tankCapacity },
        });
      }

      const newPercent = (newVolume / tankCapacity) * 100;

      // Auto-stop if tank reached CRITICAL after this extraction
      if (newPercent >= OIL_THRESHOLD.CRITICAL) {
        await prisma.equipment.update({
          where: { id: pump.id },
          data: { isAutoExtracting: false, autoExtractStartedAt: null },
        });

        if (io) {
          io.emit("oil:auto_extract_stopped", {
            equipmentId: pump.equipmentId,
            instrumentId: inst.instrumentId,
            reason: "TANK_FULL",
            currentVolume: newVolume,
            tankCapacity,
            percentage: Math.round(newPercent * 10) / 10,
          });
        }
      }

      updates.push({
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

    // Emit all updates in one batch
    if (io && updates.length > 0) {
      io.emit("oil:volume_update", { updates, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error("[AutoExtract] tick error:", err.message);
  } finally {
    isTickRunning = false;
  }
}

function getAlertLevel(percentage) {
  if (percentage >= OIL_THRESHOLD.CRITICAL) return "CRITICAL";
  if (percentage >= OIL_THRESHOLD.HIGH) return "HIGH";
  if (percentage >= OIL_THRESHOLD.WARNING) return "WARNING";
  return "NORMAL";
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
