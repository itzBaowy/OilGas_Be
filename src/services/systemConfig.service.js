import prisma from '../prisma/connect.prisma.js';
import { BadRequestException } from '../common/helpers/exception.helper.js';

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

    return JSON.parse(config.value);
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

    return DEFAULT_THRESHOLDS;
  },
};
