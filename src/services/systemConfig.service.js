import prisma from '../prisma/connect.prisma.js';
import { BadRequestException } from '../common/helpers/exception.helper.js';
import { incidentService } from './incident.service.js';
import { notificationService } from './notification.service.js';
import { getIO } from '../common/socket/init.socket.js';
import { notifyPasswordExpiring, notifyPasswordExpired } from '../common/helpers/notification.helper.js';
import { validateThresholds, validatePasswordExpiryPolicy } from '../common/helpers/validate.helper.js';

const parseNumericValue = (val) => {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? null : num;
};

const DEFAULT_THRESHOLDS = {
  pressureLimit: 120,
  tempLimit: 90,
  autoRefreshInterval: 30000,
  alertSoundEnabled: true,
  criticalAlertThreshold: 3,
};

const CONFIG_KEY = 'INCIDENT_THRESHOLDS';

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

    //1. Lưu config vào DB 
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

    // this._scanViolationsAfterThresholdChange(savedConfig, userId)
    //   .catch((err) => console.error('[ThresholdScan] Background scan failed:', err));

    return savedConfig;
  },

  async _scanViolationsAfterThresholdChange(newThresholds, adminUserId) {
    const { pressureLimit, tempLimit } = newThresholds;

    //1. Tìm incidents đang active có currentReading vượt ngưỡng MỚI
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

    const pressureViolations = existingViolations.filter(
      (inc) => inc.type === 'PRESSURE_ANOMALY' && inc.currentReading > pressureLimit
    );
    const tempViolations = existingViolations.filter(
      (inc) => inc.type === 'TEMPERATURE_ANOMALY' && inc.currentReading > tempLimit
    );

    //2. Quét Equipment specifications để phát hiện vi phạm mới
    const newIncidents = await this._detectEquipmentViolations(newThresholds, adminUserId);

    const allViolations = [...pressureViolations, ...tempViolations];
    const totalViolationCount = allViolations.length + newIncidents.length;

    //3. Lấy thông tin admin
    const adminUser = adminUserId
      ? await prisma.user.findUnique({
          where: { id: adminUserId },
          select: { id: true, fullName: true },
        })
      : null;

    //4. Gửi notification cho tất cả Supervisor và Engineer
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
      const notificationData = totalViolationCount > 0
        ? {
            recipientIds,
            title: 'Threshold Updated — Violations Detected',
            message: `Threshold settings changed by ${adminUser?.fullName || 'Admin'}. WARNING: ${totalViolationCount} violation(s) detected (Pressure: ${pressureLimit} psi, Temp: ${tempLimit}°C). ${newIncidents.length} new incident(s) created automatically.`,
            type: 'WARNING',
            category: 'SYSTEM',
            link: '/realtime-alerts',
            createdBy: adminUserId,
          }
        : {
            recipientIds,
            title: 'Threshold Updated Successfully',
            message: `Threshold settings changed by ${adminUser?.fullName || 'Admin'}. All readings are within safe limits (Pressure: ${pressureLimit} psi, Temp: ${tempLimit}°C).`,
            type: 'INFO',
            category: 'SYSTEM',
            link: null,
            createdBy: adminUserId,
          };

      await notificationService.createBulkNotifications(notificationData);
    }

    //5. Emit socket event cho toàn bộ connected clients
    const io = getIO();
    if (io) {
      io.emit('threshold_updated', {
        newThresholds: { pressureLimit, tempLimit },
        violationCount: totalViolationCount,
        existingViolations: allViolations.map((v) => ({
          instrumentId: v.instrumentId,
          instrumentName: v.instrumentName,
          type: v.type,
          currentReading: v.currentReading,
        })),
        newIncidents: newIncidents.map((v) => ({
          incidentId: v.incidentId,
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
      `Existing violations: ${allViolations.length}, New incidents: ${newIncidents.length}`
    );
  },

  // Quét Equipment specifications → tạo incident tự động nếu vượt ngưỡng
  async _detectEquipmentViolations(thresholds, adminUserId) {
    const { pressureLimit, tempLimit } = thresholds;
    const createdIncidents = [];

    const equipments = await prisma.equipment.findMany({
      where: {
        isDeleted: false,
        status: { not: 'Inactive' },
        instrument: { isNot: null },
      },
      select: {
        id: true,
        equipmentId: true,
        name: true,
        specifications: true,
        instrumentId: true,
        instrument: {
          select: { id: true, instrumentId: true, name: true, status: true },
        },
      },
    });

    // Nhóm equipment theo instrument để tránh tạo trùng incident
    const instrumentViolations = new Map();

    for (const eq of equipments) {
      if (!eq.specifications || !eq.instrument) continue;

      const specs = typeof eq.specifications === 'string'
        ? JSON.parse(eq.specifications)
        : eq.specifications;

      const pressure = parseNumericValue(specs.pressure);
      const temperature = parseNumericValue(specs.temperature);

      const violations = [];
      if (pressure !== null && pressure > pressureLimit) {
        violations.push({ type: 'PRESSURE_ANOMALY', reading: pressure, limit: pressureLimit });
      }
      if (temperature !== null && temperature > tempLimit) {
        violations.push({ type: 'TEMPERATURE_ANOMALY', reading: temperature, limit: tempLimit });
      }

      if (violations.length === 0) continue;

      const insId = eq.instrument.instrumentId;
      if (!instrumentViolations.has(insId)) {
        instrumentViolations.set(insId, {
          instrument: eq.instrument,
          violations: [],
        });
      }
      for (const v of violations) {
        instrumentViolations.get(insId).violations.push({
          ...v,
          equipmentId: eq.equipmentId,
          equipmentName: eq.name,
        });
      }
    }

    // Tạo incident cho từng vi phạm chưa có incident active cùng type + instrumentId
    for (const [insId, data] of instrumentViolations) {
      const existingActive = await prisma.incident.findMany({
        where: {
          instrumentId: insId,
          status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
        },
        select: { type: true },
      });
      const activeTypes = new Set(existingActive.map((i) => i.type));

      for (const v of data.violations) {
        if (activeTypes.has(v.type)) continue;
        activeTypes.add(v.type);

        const severityLevel = this._calculateSeverity(v.reading, v.limit);

        try {
          const incident = await incidentService.createIncident(
            {
              instrumentId: insId,
              instrumentName: data.instrument.name,
              type: v.type,
              severity: severityLevel,
              description: `Auto-detected: ${v.equipmentName} (${v.equipmentId}) reading ${v.reading} exceeds threshold ${v.limit}. Triggered by threshold scan.`,
              currentReading: v.reading,
              threshold: v.limit,
            },
            { id: adminUserId, fullName: 'System Auto-Detection' }
          );
          createdIncidents.push(incident);

          // Chuyển Instrument sang Maintenance nếu chưa phải
          if (data.instrument.status !== 'Maintenance' && data.instrument.status !== 'Decommissioned') {
            await prisma.instrument.update({
              where: { id: data.instrument.id },
              data: { status: 'Maintenance' },
            });
          }
        } catch (err) {
          console.error(`[ThresholdScan] Failed to create incident for ${insId}:`, err.message);
        }
      }
    }

    return createdIncidents;
  },

  _calculateSeverity(reading, limit) {
    const ratio = reading / limit;
    if (ratio >= 1.5) return 'FATAL';
    if (ratio >= 1.2) return 'CRITICAL';
    return 'WARNING';
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

    /* [THRESHOLD_SCAN_DISABLED] ───────────────────────────────────────────
     * Tạm tắt: Background quét thiết bị vi phạm ngưỡng mặc định sau khi reset.
     * Khi bật lại: bỏ comment block bên dưới.
     * ──────────────────────────────────────────────────────────────────────── */
    // this._scanViolationsAfterThresholdChange(DEFAULT_THRESHOLDS, userId)
    //   .catch((err) => console.error('[ThresholdScan] Background scan after reset failed:', err));

    return DEFAULT_THRESHOLDS;
  },

  // Quét vi phạm khi user mở web lần đầu (GET endpoint, không tạo incident mới)
  async scanCurrentViolations() {
    const thresholds = await this.getIncidentThresholds();
    const { pressureLimit, tempLimit } = thresholds;

    // 1. Incidents đang active vượt ngưỡng
    const activeIncidents = await prisma.incident.findMany({
      where: {
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
        currentReading: { not: null },
      },
      select: {
        id: true,
        incidentId: true,
        instrumentId: true,
        instrumentName: true,
        type: true,
        severity: true,
        status: true,
        currentReading: true,
        threshold: true,
      },
    });

    const violatingIncidents = activeIncidents.filter((inc) => {
      if (inc.type === 'PRESSURE_ANOMALY') return inc.currentReading > pressureLimit;
      if (inc.type === 'TEMPERATURE_ANOMALY') return inc.currentReading > tempLimit;
      return false;
    });

    // 2. Quét Equipment specifications hiện tại
    const equipments = await prisma.equipment.findMany({
      where: {
        isDeleted: false,
        status: { not: 'Inactive' },
        instrument: { isNot: null },
      },
      select: {
        equipmentId: true,
        name: true,
        specifications: true,
        instrument: {
          select: { instrumentId: true, name: true },
        },
      },
    });

    const equipmentViolations = [];
    for (const eq of equipments) {
      if (!eq.specifications || !eq.instrument) continue;
      const specs = typeof eq.specifications === 'string'
        ? JSON.parse(eq.specifications) : eq.specifications;

      const pressure = parseNumericValue(specs.pressure);
      const temperature = parseNumericValue(specs.temperature);

      if (pressure !== null && pressure > pressureLimit) {
        equipmentViolations.push({
          equipmentId: eq.equipmentId,
          equipmentName: eq.name,
          instrumentId: eq.instrument.instrumentId,
          instrumentName: eq.instrument.name,
          type: 'PRESSURE_ANOMALY',
          currentReading: pressure,
          threshold: pressureLimit,
        });
      }
      if (temperature !== null && temperature > tempLimit) {
        equipmentViolations.push({
          equipmentId: eq.equipmentId,
          equipmentName: eq.name,
          instrumentId: eq.instrument.instrumentId,
          instrumentName: eq.instrument.name,
          type: 'TEMPERATURE_ANOMALY',
          currentReading: temperature,
          threshold: tempLimit,
        });
      }
    }

    return {
      thresholds: { pressureLimit, tempLimit },
      violatingIncidents,
      equipmentViolations,
      totalViolations: violatingIncidents.length + equipmentViolations.length,
    };
  },

  async getLockoutPolicy() {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'LOCKOUT_POLICY' },
    });

    if (!config) {
      return {
        maxFailedAttempts: 5,
        lockoutDurationMinutes: 15,
      };
    }

    return JSON.parse(config.value);
  },

  async updateLockoutPolicy(data, userId) {
    const { maxFailedAttempts, lockoutDurationMinutes } = data;

    // Validation
    if (!Number.isInteger(maxFailedAttempts) || maxFailedAttempts < 1 || maxFailedAttempts > 10) {
      throw new BadRequestException('Max failed attempts must be between 1 and 10');
    }

    if (!Number.isInteger(lockoutDurationMinutes) || lockoutDurationMinutes < 1 || lockoutDurationMinutes > 60) {
      throw new BadRequestException('Lockout duration must be between 1 and 60 minutes');
    }

    const config = await prisma.systemConfig.upsert({
      where: { key: 'LOCKOUT_POLICY' },
      update: { 
        value: JSON.stringify({ maxFailedAttempts, lockoutDurationMinutes }), 
        updatedBy: userId 
      },
      create: {
        key: 'LOCKOUT_POLICY',
        value: JSON.stringify({ maxFailedAttempts, lockoutDurationMinutes }),
        description: 'Cấu hình chính sách khóa IP sau nhiều lần đăng nhập thất bại',
        updatedBy: userId,
      },
    });

    return JSON.parse(config.value);
  },

  // PASSWORD EXPIRY POLICY


  async getPasswordExpiryPolicy() {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'PASSWORD_EXPIRY_POLICY' },
    });

    if (!config) {
      return {
        expiryDays: 90,
        notifyDaysBefore: 7,
        enabled: true,
      };
    }

    return JSON.parse(config.value);
  },

  async updatePasswordExpiryPolicy(data, userId) {
    const { expiryDays, notifyDaysBefore, enabled } = data;

    validatePasswordExpiryPolicy(data);

    const config = await prisma.systemConfig.upsert({
      where: { key: 'PASSWORD_EXPIRY_POLICY' },
      update: { 
        value: JSON.stringify({ expiryDays, notifyDaysBefore, enabled }), 
        updatedBy: userId
      },
      create: {
        key: 'PASSWORD_EXPIRY_POLICY',
        value: JSON.stringify({ expiryDays, notifyDaysBefore, enabled }),
        description: 'Cấu hình chính sách hết hạn mật khẩu',
        updatedBy: userId,
      },
    });

    return JSON.parse(config.value);
  },

  /**
   * Check passwords expiring soon and send notifications
   * Called by scheduled job (e.g., daily at 9 AM)
   */
  async checkAndNotifyPasswordExpiry() {
    const policy = await this.getPasswordExpiryPolicy();
    
    if (!policy.enabled) {
      console.log('[PasswordExpiry] Policy is disabled, skipping check');
      return { notified: 0, expired: 0 };
    }

    const now = new Date();
    const expiryThreshold = new Date(now);
    expiryThreshold.setDate(expiryThreshold.getDate() - policy.expiryDays);

    const notifyThreshold = new Date(now);
    notifyThreshold.setDate(notifyThreshold.getDate() - (policy.expiryDays - policy.notifyDaysBefore));

    // Find users whose password will expire soon (within notifyDaysBefore days)
    const usersToNotify = await prisma.user.findMany({
      where: {
        isActive: true,
        lastPasswordChangeAt: {
          lte: notifyThreshold,
          gt: expiryThreshold,
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        lastPasswordChangeAt: true,
      },
    });

    // Find users whose password has already expired
    const expiredUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        lastPasswordChangeAt: {
          lte: expiryThreshold,
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        lastPasswordChangeAt: true,
      },
    });

    // Send notifications for expiring passwords
    for (const user of usersToNotify) {
      const lastChange = new Date(user.lastPasswordChangeAt || user.createdAt);
      const expiryDate = new Date(lastChange);
      expiryDate.setDate(expiryDate.getDate() + policy.expiryDays);
      
      const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      await notifyPasswordExpiring(user.id, daysLeft);
    }

    // Send notifications for expired passwords
    for (const user of expiredUsers) {
      await notifyPasswordExpired(user.id);
    }

    console.log(`[PasswordExpiry] Notified ${usersToNotify.length} users about expiring passwords, ${expiredUsers.length} expired`);
    
    return { 
      notified: usersToNotify.length, 
      expired: expiredUsers.length 
    };
  },
};
