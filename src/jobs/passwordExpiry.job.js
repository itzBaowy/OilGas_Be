import cron from 'node-cron';
import { systemConfigService } from '../services/systemConfig.service.js';

/**
 * Password Expiry Check Job
 * 
 * Chạy mỗi ngày lúc 0:00 (nửa đêm) để:
 * 1. Kiểm tra users có password sắp hết hạn (trong notifyDaysBefore ngày)
 * 2. Kiểm tra users có password đã hết hạn
 * 3. Gửi notification cho các users này
 * 
 * Cron pattern: '0 0 * * *' = 0:00 (midnight) mỗi ngày
 */

let scheduledJob = null;

export const startPasswordExpiryJob = () => {
  if (scheduledJob) {
    console.log('[PasswordExpiryJob] Job already running');
    return;
  }

  // chạy mỗi 10 giây để test
//   scheduledJob = cron.schedule('*/10 * * * * *', async () => {
  scheduledJob = cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[PasswordExpiryJob] Starting password expiry check...');
      const result = await systemConfigService.checkAndNotifyPasswordExpiry();
      console.log(`[PasswordExpiryJob] Completed. Notified: ${result.notified}, Expired: ${result.expired}`);
    } catch (error) {
      console.error('[PasswordExpiryJob] Error:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh" // change timezone
  });

  console.log('[PasswordExpiryJob] Scheduled to run daily at 0:00 (midnight) - Asia/Ho_Chi_Minh');
};

export const stopPasswordExpiryJob = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('[PasswordExpiryJob] Stopped');
  }
};

// testing
export const runPasswordExpiryCheckNow = async () => {
  try {
    console.log('[PasswordExpiryJob] Manual run started...');
    const result = await systemConfigService.checkAndNotifyPasswordExpiry();
    console.log(`[PasswordExpiryJob] Manual run completed. Notified: ${result.notified}, Expired: ${result.expired}`);
    return result;
  } catch (error) {
    console.error('[PasswordExpiryJob] Manual run error:', error);
    throw error;
  }
};
