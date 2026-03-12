// server.js
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import rootRouter from './src/routers/root.router.js';
import { appErorr } from './src/common/helpers/handle-error.helper.js';
import { NotFoundException } from './src/common/helpers/exception.helper.js';
import { initGoogleStrategy } from './src/common/passport/login-google.passport.js';
import { logger } from './src/common/middlewares/logger.middleware.js';
import { swaggerOptions } from './src/common/swagger/swagger.config.js';
import { createServer } from 'http';
import { initSocket } from './src/common/socket/init.socket.js';
import { incidentService } from './src/services/incident.service.js';
import { startPasswordExpiryJob } from './src/jobs/passwordExpiry.job.js';
import { startAutoDeactivationJob } from './src/jobs/autoDeactivation.job.js';
import { startAutoExtractEngine } from './src/services/autoExtract.engine.js';
import { connectRedis } from './src/config/redis.config.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

// Cấu hình Middleware cơ bản
app.use(cors());           // Cho phép FE gọi API
app.use(express.json());   // Đọc được body JSON
app.use(logger);           // Logger middleware - tự động lưu logs vào DB

initGoogleStrategy(); // Khởi tạo chiến lược đăng nhập Google

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Khai báo Routes
app.use('/api', rootRouter);

// Middleware xử lí các roule không tìm thấy
app.use((req, res, next) => {
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip;
    
    // Bỏ qua các request không quan trọng (favicon, robots.txt, etc.)
    // Browser tự động request favicon.ico khi truy cập trang web
    // Không cần throw error cho những request này
    if (url === '/favicon.ico' || url === '/robots.txt') {
        return res.status(404).end(); // Trả về 404 một cách im lặng
    }
    // Throw NotFoundException cho các route không tồn tại
    throw new NotFoundException();
});
app.use(appErorr);
const httpServer = createServer(app);
initSocket(httpServer);
// Khởi chạy Server
httpServer.listen(PORT, () => {
  console.log(`-----------------------------------------`);
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log(`📄 Swagger Docs at http://localhost:${PORT}/api-docs`);
  console.log(`-----------------------------------------`);

  // Connect to Redis for session management
  connectRedis()
    .catch((err) => console.error('[Redis] Connection failed:', err.message));

  // Startup check: sửa Instrument kẹt Maintenance khi không có incident active
  incidentService.reconcileInstrumentStatuses()
    .catch((err) => console.error('[StartupCheck] Failed:', err.message));

  // Start password expiry check job (runs daily at 9 AM)
  startPasswordExpiryJob();

  // Start auto deactivation check job (runs daily at midnight)
  startAutoDeactivationJob();
});