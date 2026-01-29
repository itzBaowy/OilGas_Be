import { logService } from '../../services/log.service.js';

export const logger = async (req, res, next) => {
  // Bỏ qua logging cho /ping
  if (req.path === '/ping' || req.originalUrl === '/ping') {
    return next();
  }

  const startTime = Date.now();

  // Lưu response.json gốc
  const originalJson = res.json;

  // Override res.json để capture status code và response
  res.json = function (data) {
    const responseTime = Date.now() - startTime;

    // Lấy thông tin user nếu đã đăng nhập (từ protect middleware)
    const userId = req.user?.id || null;
    const userEmail = req.user?.email || null;

    // Lấy IP address (hỗ trợ proxy như Render, Heroku)
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                      req.headers['x-real-ip'] || 
                      req.ip || 
                      req.connection.remoteAddress || 
                      'unknown';

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

    console.log('📄 Người dùng', logData.userEmail ?? 'Guest', 'Tạo một request url: ', logData.path, ', với method', logData.method, '=>', logData.statusCode);
    console.log('Địa chỉ IP:', logData.ipAddress );
    // Lưu log vào DB (không chờ, chạy async)
    logService.createLog(logData).catch((err) => {
      console.error('❌ Failed to save log:', err.message);
    });

    // Gọi response.json gốc
    return originalJson.call(this, data);
  };

  next();
};
