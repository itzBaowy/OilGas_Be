// Cấu hình Swagger (Tài liệu API)
import dotenv from 'dotenv';
dotenv.config();
const mode = process.env.MODE;
export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Oil & Gas Management API',
      version: '1.0.0',
      description: 'Document API cho dự án',
    },
    servers: [
        mode === 'development' 
            ? { url: 'http://localhost:3000', description: 'Development server' }
            : { url: 'https://oilgas-backend.onrender.com', description: 'Production server' }
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
