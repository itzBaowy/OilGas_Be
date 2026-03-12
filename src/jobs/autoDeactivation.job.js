import cron from 'node-cron';
import { systemConfigService } from '../services/systemConfig.service.js';

let scheduledJob = null;

export const startAutoDeactivationJob = () => {
  if (scheduledJob) {
    console.log('[AutoDeactivation] Job already running');
    return;
  }

  scheduledJob = cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[AutoDeactivation] Starting inactive user check...');
      const result = await systemConfigService.checkAndDeactivateInactiveUsers();
      console.log(`[AutoDeactivation] Completed. Deactivated: ${result.deactivated} user(s)`);
    } catch (error) {
      console.error('[AutoDeactivation] Error:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  console.log('[AutoDeactivation] Scheduled to run daily at 0:00 (midnight) - Asia/Ho_Chi_Minh');
};

export const stopAutoDeactivationJob = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('[AutoDeactivation] Stopped');
  }
};

/**
 * Manual trigger - for testing or admin trigger
 */
export const runAutoDeactivationCheckNow = async () => {
  try {
    console.log('[AutoDeactivation] Manual run started...');
    const result = await systemConfigService.checkAndDeactivateInactiveUsers();
    console.log(`[AutoDeactivation] Manual run completed. Deactivated: ${result.deactivated} user(s)`);
    return result;
  } catch (error) {
    console.error('[AutoDeactivation] Manual run error:', error);
    throw error;
  }
};
