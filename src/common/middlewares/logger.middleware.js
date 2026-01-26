import { logService } from '../../services/log.service.js';

export const logger = async (req, res, next) => {
  const startTime = Date.now();

  // Lưu response.json gốc
  const originalJson = res.json;

  // Override res.json để capture status code và response
  res.json = function (data) {
    const responseTime = Date.now() - startTime;

    // Lấy thông tin user nếu đã đăng nhập (từ protect middleware)
    const userId = req.user?.id || null;
    const userEmail = req.user?.email || null;

    // Lấy IP address
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    // Lấy User-Agent
    const userAgent = req.get('user-agent') || null;

    // Sanitize request body (xóa sensitive data)
    let requestBody = null;
    if (req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = { ...req.body };
      // Xóa các field nhạy cảm
      delete sanitizedBody.password;
      delete sanitizedBody.oldPassword;
      delete sanitizedBody.newPassword;
      delete sanitizedBody.resetPasswordToken;
      requestBody = JSON.stringify(sanitizedBody);
    }

    // Lấy error message nếu có
    const errorMessage = data?.error || data?.message || null;

    // Tạo log data
    const logData = {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      requestBody,
      responseTime,
      errorMessage: res.statusCode >= 400 ? errorMessage : null,
    };

    // Lưu log vào DB (không chờ, chạy async)
    logService.createLog(logData).catch((err) => {
      console.error('❌ Failed to save log:', err.message);
    });

    // Gọi response.json gốc
    return originalJson.call(this, data);
  };

  next();
};
