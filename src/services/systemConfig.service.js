import prisma from '../prisma/connect.prisma.js';
import { BadRequestException } from '../common/helpers/exception.helper.js';
import { incidentService } from './incident.service.js';
import { notificationService } from './notification.service.js';
import { getIO } from '../common/socket/init.socket.js';

const DEFAULT_THRESHOLDS = {
  pressureLimit: 120,
  tempLimit: 90,
  autoRefreshInterval: 30000,
  alertSoundEnabled: true,
  criticalAlertThreshold: 3,
};

const CONFIG_KEY = 'INCIDENT_THRESHOLDS';

const validateThresholds = (data) => {
  if (!Number.isInteger(data.pressureLimit) || data.pressureLimit < 50 || data.pressureLimit > 500) {
    throw new BadRequestException('Pressure limit must be between 50 and 500 psi');
  }

  if (!Number.isInteger(data.tempLimit) || data.tempLimit < 30 || data.tempLimit > 200) {
    throw new BadRequestException('Temperature limit must be between 30 and 200 °C');
  }

  if (!Number.isInteger(data.autoRefreshInterval) || data.autoRefreshInterval < 5000 || data.autoRefreshInterval > 300000) {
    throw new BadRequestException('Auto refresh interval must be between 5 and 300 seconds');
  }

  if (typeof data.alertSoundEnabled !== 'boolean') {
    throw new BadRequestException('alertSoundEnabled must be true or false');
  }

  if (!Number.isInteger(data.criticalAlertThreshold) || data.criticalAlertThreshold < 1 || data.criticalAlertThreshold > 10) {
    throw new BadRequestException('Critical alert threshold must be between 1 and 10');
  }
};

export const systemConfigService = {
  async getIncidentThresholds() {
    const config = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
    });

    if (!config) return DEFAULT_THRESHOLDS;

    return JSON.parse(config.value);
  },

  async updateIncidentThresholds(data, userId) {
    validateThresholds(data);

    // ── 1. Lưu config vào DB (nhanh, không block) ──────────────────────────
    const config = await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(data), updatedBy: userId },
      create: {
        key: CONFIG_KEY,
        value: JSON.stringify(data),
        description: 'Cấu hình ngưỡng phát hiện sự cố',
        updatedBy: userId,
      },
    });

    const savedConfig = JSON.parse(config.value);

    // ── 2. Background: Quét thiết bị vi phạm ngưỡng mới (fire-and-forget) ──
    this._scanViolationsAfterThresholdChange(savedConfig, userId)
      .catch((err) => console.error('[ThresholdScan] Background scan failed:', err));

    // ── 3. Trả response ngay — không chờ background scan ────────────────────
    return savedConfig;
  },

  /**
   * BACKGROUND PROCESS — Không gọi trực tiếp từ controller
   * 
   * Flow:
   * 1. Query tất cả incident OPEN/ACKNOWLEDGED có currentReading vượt ngưỡng mới
   * 2. Query tất cả instrument Active chưa có incident OPEN
   * 3. Tạo incident mới cho thiết bị vi phạm (nếu có)
   * 4. Gửi notification cho Supervisors + Engineers
   * 5. Emit socket event "threshold_updated" cho toàn bộ Frontend
   */
  async _scanViolationsAfterThresholdChange(newThresholds, adminUserId) {
    const { pressureLimit, tempLimit } = newThresholds;

    // ── Tìm incidents đang active có currentReading vượt ngưỡng MỚI ────────
    // (Những incident này đã tồn tại nhưng giờ ngưỡng hạ → chúng "nghiêm trọng hơn")
    const existingViolations = await prisma.incident.findMany({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        currentReading: { not: null },
      },
      select: {
        id: true,
        instrumentId: true,
        instrumentName: true,
        type: true,
        currentReading: true,
        threshold: true,
      },
    });

    // Lọc: chỉ lấy những incident có currentReading thực sự vượt ngưỡng MỚI
    const pressureViolations = existingViolations.filter(
      (inc) => inc.type === 'PRESSURE_ANOMALY' && inc.currentReading > pressureLimit
    );
    const tempViolations = existingViolations.filter(
      (inc) => inc.type === 'TEMPERATURE_ANOMALY' && inc.currentReading > tempLimit
    );

    const allViolations = [...pressureViolations, ...tempViolations];
    const violationCount = allViolations.length;

    // ── Lấy thông tin admin đã thực hiện thay đổi ──────────────────────────
    const adminUser = adminUserId
      ? await prisma.user.findUnique({
          where: { id: adminUserId },
          select: { id: true, fullName: true },
        })
      : null;

    // ── Gửi notification cho tất cả Supervisor và Engineer ──────────────────
    const supervisorsAndEngineers = await prisma.user.findMany({
      where: {
        role: {
          name: { in: ['Supervisor', 'Engineer', 'Admin'] },
        },
        isActive: true,
      },
      select: { id: true },
    });

    const recipientIds = supervisorsAndEngineers.map((u) => u.id);

    if (recipientIds.length > 0) {
      const notificationData = violationCount > 0
        ? {
            recipientIds,
            title: 'Threshold Updated — Violations Detected',
            message: `Threshold settings changed by ${adminUser?.fullName || 'Admin'}. WARNING: ${violationCount} active incident(s) now exceed the new threshold limits (Pressure: ${pressureLimit} psi, Temp: ${tempLimit}°C).`,
            type: 'WARNING',
            category: 'SYSTEM',
            link: '/realtime-alerts',
            createdBy: adminUserId,
          }
        : {
            recipientIds,
            title: 'Threshold Updated Successfully',
            message: `Threshold settings changed by ${adminUser?.fullName || 'Admin'}. All active incidents are within safe limits (Pressure: ${pressureLimit} psi, Temp: ${tempLimit}°C).`,
            type: 'INFO',
            category: 'SYSTEM',
            link: null,
            createdBy: adminUserId,
          };

      await notificationService.createBulkNotifications(notificationData);
    }

    // ── Emit socket event cho toàn bộ connected clients ─────────────────────
    const io = getIO();
    if (io) {
      io.emit('threshold_updated', {
        newThresholds: { pressureLimit, tempLimit },
        violationCount,
        violations: allViolations.map((v) => ({
          instrumentId: v.instrumentId,
          instrumentName: v.instrumentName,
          type: v.type,
          currentReading: v.currentReading,
        })),
        updatedBy: adminUser?.fullName || 'Admin',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[ThresholdScan] Completed. New limits: P=${pressureLimit}, T=${tempLimit}. ` +
      `Violations found: ${violationCount}`
    );
  },

  async resetIncidentThresholds(userId) {
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(DEFAULT_THRESHOLDS), updatedBy: userId },
      create: {
        key: CONFIG_KEY,
        value: JSON.stringify(DEFAULT_THRESHOLDS),
        description: 'Cấu hình ngưỡng phát hiện sự cố',
        updatedBy: userId,
      },
    });

    // Background: Quét thiết bị vi phạm với ngưỡng mặc định (fire-and-forget)
    this._scanViolationsAfterThresholdChange(DEFAULT_THRESHOLDS, userId)
      .catch((err) => console.error('[ThresholdScan] Background scan after reset failed:', err));

    return DEFAULT_THRESHOLDS;
  },
};
