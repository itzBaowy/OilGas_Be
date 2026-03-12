import prisma from '../prisma/connect.prisma.js';
import { BadRequestException } from '../common/helpers/exception.helper.js';
import { incidentService } from './incident.service.js';
import { notificationService } from './notification.service.js';
import { getIO } from '../common/socket/init.socket.js';
import { notifyPasswordExpiring, notifyPasswordExpired, notifyAccountDeactivated } from '../common/helpers/notification.helper.js';

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

    /* [THRESHOLD_SCAN_DISABLED] ───────────────────────────────────────────
     * Tạm tắt: Background quét thiết bị vi phạm ngưỡng mới sau khi update.
     * Khi bật lại: bỏ comment block bên dưới.
     * ──────────────────────────────────────────────────────────────────────── */
    // this._scanViolationsAfterThresholdChange(savedConfig, userId)
    //   .catch((err) => console.error('[ThresholdScan] Background scan failed:', err));

    // ── 3. Trả response ngay — không chờ background scan ────────────────────
    return savedConfig;
  },

  /**
   * BACKGROUND PROCESS — Không gọi trực tiếp từ controller
   * 
   * Flow:
   * 1. Query tất cả incident OPEN/ACKNOWLEDGED có currentReading vượt ngưỡng mới
   * 2. Query tất cả Equipment thuộc Instrument Active — kiểm tra specifications
   * 3. Tạo incident mới cho thiết bị vi phạm chưa có incident active
   * 4. Cập nhật Instrument status → Maintenance nếu có vi phạm
   * 5. Gửi notification cho Supervisors + Engineers
   * 6. Emit socket event "threshold_updated" cho toàn bộ Frontend
   */
  async _scanViolationsAfterThresholdChange(newThresholds, adminUserId) {
    const { pressureLimit, tempLimit } = newThresholds;

    // ── 1. Tìm incidents đang active có currentReading vượt ngưỡng MỚI ─────
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

    // ── 2. Quét Equipment specifications để phát hiện vi phạm mới ───────────
    const newIncidents = await this._detectEquipmentViolations(newThresholds, adminUserId);

    const allViolations = [...pressureViolations, ...tempViolations];
    const totalViolationCount = allViolations.length + newIncidents.length;

    // ── 3. Lấy thông tin admin ──────────────────────────────────────────────
    const adminUser = adminUserId
      ? await prisma.user.findUnique({
          where: { id: adminUserId },
          select: { id: true, fullName: true },
        })
      : null;

    // ── 4. Gửi notification cho tất cả Supervisor và Engineer ───────────────
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

    // ── 5. Emit socket event cho toàn bộ connected clients ──────────────────
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

    // Validation
    if (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 365) {
      throw new BadRequestException('Expiry days must be between 1 and 365');
    }

    if (!Number.isInteger(notifyDaysBefore) || notifyDaysBefore < 1 || notifyDaysBefore > 30) {
      throw new BadRequestException('Notify days before must be between 1 and 30');
    }

    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('Enabled must be true or false');
    }

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

  async getAutoDeactivationPolicy() {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'AUTO_DEACTIVATION_POLICY' },
    });

    if (!config) {
      return {
        inactivityDays: 30,
        enabled: true,
      };
    }

    return JSON.parse(config.value);
  },

  async updateAutoDeactivationPolicy(data, userId) {
    const { inactivityDays, enabled } = data;

    // Validation
    if (!Number.isInteger(inactivityDays) || inactivityDays < 1 || inactivityDays > 365) {
      throw new BadRequestException('Inactivity days must be between 1 and 365');
    }

    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('Enabled must be true or false');
    }

    const config = await prisma.systemConfig.upsert({
      where: { key: 'AUTO_DEACTIVATION_POLICY' },
      update: { 
        value: JSON.stringify({ inactivityDays, enabled }), 
        updatedBy: userId
      },
      create: {
        key: 'AUTO_DEACTIVATION_POLICY',
        value: JSON.stringify({ inactivityDays, enabled }),
        description: 'Cấu hình tự động vô hiệu hóa tài khoản không hoạt động',
        updatedBy: userId,
      },
    });

    return JSON.parse(config.value);
  },

  async checkAndDeactivateInactiveUsers() {
    const policy = await this.getAutoDeactivationPolicy();
    
    if (!policy.enabled) {
      console.log('[AutoDeactivation] Policy is disabled, skipping check');
      return { deactivated: 0 };
    }

    const now = new Date();
    const inactivityThreshold = new Date(now);
    inactivityThreshold.setDate(inactivityThreshold.getDate() - policy.inactivityDays);

    // Find users whose last login was before the inactivity threshold
    // Use LoginHistory to determine last activity
    const allActiveUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        loginHistory: {
          orderBy: {
            loginAt: 'desc'
          },
          take: 1,
        },
      },
    });

    const usersToDeactivate = [];

    for (const user of allActiveUsers) {
      const lastLogin = user.loginHistory[0]?.loginAt;
      const lastActivityDate = lastLogin ? new Date(lastLogin) : new Date(user.createdAt);

      if (lastActivityDate < inactivityThreshold) {
        usersToDeactivate.push({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          lastActivityDate,
        });
      }
    }

    // Deactivate users
    for (const user of usersToDeactivate) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: false,
          status: 'INACTIVE',
        },
      });

      // Send notification
      await notifyAccountDeactivated(user.id, policy.inactivityDays);
    }

    console.log(`[AutoDeactivation] Deactivated ${usersToDeactivate.length} inactive users (threshold: ${policy.inactivityDays} days)`);
    
    return { 
      deactivated: usersToDeactivate.length 
    };
  },

  async getSessionTimeoutPolicy() {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'SESSION_TIMEOUT_POLICY' },
    });

    if (!config) {
      return {
        timeoutMinutes: 15,
      };
    }

    return JSON.parse(config.value);
  },

  async updateSessionTimeoutPolicy(data, userId) {
    const { timeoutMinutes } = data;

    // Validation
    if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > 480) {
      throw new BadRequestException('Timeout minutes must be between 1 and 480 (8 hours)');
    }

    const config = await prisma.systemConfig.upsert({
      where: { key: 'SESSION_TIMEOUT_POLICY' },
      update: { 
        value: JSON.stringify({ timeoutMinutes }), 
        updatedBy: userId
      },
      create: {
        key: 'SESSION_TIMEOUT_POLICY',
        value: JSON.stringify({ timeoutMinutes }),
        description: 'Cấu hình thời gian timeout session không hoạt động',
        updatedBy: userId,
      },
    });

    return JSON.parse(config.value);
  },
};
