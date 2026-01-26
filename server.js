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


const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Middleware cơ bản
app.use(cors());           // Cho phép FE gọi API
app.use(express.json());   // Đọc được body JSON
app.use(logger);           // Logger middleware - tự động lưu logs vào DB

// Cấu hình Swagger (Tài liệu API)
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Oil & Gas Management API',
      version: '1.0.0',
      description: 'Document API cho dự án',
    },
    servers: [
      { url: `http://localhost:${PORT}` },
      { url: `https://oilgas-backend.onrender.com` },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập access token để xác thực',
        },
      },
    },
  },
  // Đường dẫn đến các file chứa comment @swagger
  apis: ['./src/routers/*.js'], 
};

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
    
    // Log các request khác để debug
    console.log(`${method} ${url} ${ip}`);
    
    // Throw NotFoundException cho các route không tồn tại
    throw new NotFoundException();
});
app.use(appErorr);

// Khởi chạy Server
app.listen(PORT, () => {
  console.log(`-----------------------------------------`);
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log(`📄 Swagger Docs at http://localhost:${PORT}/api-docs`);
  console.log(`-----------------------------------------`);
});