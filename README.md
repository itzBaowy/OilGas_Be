# 🛢️ Oil & Gas Management System - Backend API

Backend API cho hệ thống quản lý Oil & Gas sử dụng Node.js, Express, Prisma và MongoDB/

---

## 📋 Mục lục
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt và chạy project](#cài-đặt-và-chạy-project)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Hướng dẫn phát triển tính năng mới](#hướng-dẫn-phát-triển-tính-năng-mới)
- [Best Practices](#best-practices)

---

## 🛠️ Công nghệ sử dụng

- **Node.js** v18+ 
- **Express.js** v5.2 - Web framework
- **Prisma** v6.19 - ORM để tương tác với database
- **MongoDB** - NoSQL database
- **JWT** - Xác thực và phân quyền
- **Bcrypt.js** - Mã hóa password
- **Swagger** - Tài liệu API tự động
- **Nodemon** - Auto-reload trong quá trình phát triển

---

## 💻 Yêu cầu hệ thống

- Node.js phiên bản >= 18.x
- MongoDB (Local hoặc Cloud - MongoDB Atlas)
- npm hoặc yarn

---

## 🚀 Cài đặt và chạy project

### 1. Clone project

```bash
git clone <repository-url>
cd OilGasProject
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` ở thư mục gốc với nội dung:

```env
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/oilgas_db"

# Server
PORT=3000

# JWT Secret
JWT_SECRET="your-super-secret-key-here-change-in-production"
```

**Lưu ý:** Thay `DATABASE_URL` bằng connection string MongoDB của bạn.

### 4. Setup Database với Prisma

```bash
npm run prisma
```

Lệnh này sẽ:
- Push schema lên MongoDB
- Generate Prisma Client

### 5. Khởi chạy server

**Development mode (với nodemon):**
```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### 6. Truy cập Swagger Documentation

Mở trình duyệt và truy cập:
```
http://localhost:3000/api-docs
```

---

## 📁 Cấu trúc thư mục

```
OilGasProject/
├── generated/              # Prisma Client (auto-generated)
│   └── prisma/
├── prisma/
│   └── schema.prisma      # Database schema definition
├── src/
│   ├── common/
│   │   └── helpers/
│   │       └── function.helper.js    # Hàm tiện ích chung
│   ├── controllers/
│   │   └── auth.controller.js        # Controller xử lý request/response
│   ├── services/
│   │   └── auth.service.js           # Business logic
│   ├── routers/
│   │   └── auth.router.js            # Định nghĩa routes + Swagger docs
│   └── prisma/
│       └── connect.prisma.js         # Prisma connection instance
├── server.js               # Entry point
├── package.json
└── README.md
```

### 📝 Giải thích các layer:

- **Router**: Định nghĩa endpoints và Swagger documentation
- **Controller**: Nhận request, gọi service, trả response
- **Service**: Xử lý business logic, giao tiếp với database
- **Helper**: Các hàm tiện ích dùng chung

---

## 🗄️ Database Schema

### User Model
```prisma
model User {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  email       String   @unique
  password    String
  fullName    String
  phoneNumber String?
  roleId      String   @db.ObjectId
  role        Role     @relation(fields: [roleId], references: [id])
  status      String   @default("ACTIVE")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Role Model
```prisma
model Role {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String   @unique
  description String?
  permissions String[]
  users       User[]
}
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Đăng ký tài khoản mới | `{ fullName, email, password, phoneNumber }` |
| POST | `/api/auth/login` | Đăng nhập | `{ email, password }` |

#### Ví dụ Request - Register:
```json
{
  "fullName": "Nguyen Van A",
  "email": "nguyenvana@example.com",
  "password": "password123",
  "phoneNumber": "0901234567"
}
```

#### Ví dụ Response - Login:
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🔧 Hướng dẫn phát triển tính năng mới

### Bước 1: Cập nhật Prisma Schema (Nếu cần)

Nếu tính năng cần thêm model mới trong database:

**File:** `prisma/schema.prisma`

```prisma
model Equipment {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  type        String
  status      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("Equipment")
}
```

Sau đó chạy:
```bash
npm run prisma
```

### Bước 2: Tạo Service

**File:** `src/services/equipment.service.js`

```javascript
import prisma from '../prisma/connect.prisma.js';

const getAllEquipments = async () => {
  return await prisma.equipment.findMany();
};

const createEquipment = async (data) => {
  const { name, type, status } = data;
  return await prisma.equipment.create({
    data: { name, type, status }
  });
};

// Export default object chứa các methods
export default {
  getAllEquipments,
  createEquipment
};
```

### Bước 3: Tạo Controller

**File:** `src/controllers/equipment.controller.js`

```javascript
import { responseSuccess } from "../common/helpers/function.helper.js";
import equipmentService from "../services/equipment.service.js";

export const equipmentController = {
  async getAll(req, res, next) {
    try {
      const result = await equipmentService.getAllEquipments();
      const response = responseSuccess(result, "Get equipments successful");
      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const result = await equipmentService.createEquipment(req.body);
      const response = responseSuccess(result, "Create equipment successful", 201);
      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }
};
```

### Bước 4: Tạo Router với Swagger docs

**File:** `src/routers/equipment.router.js`

```javascript
import express from 'express';
import { equipmentController } from '../controllers/equipment.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Equipment
 *   description: API quản lý thiết bị
 */

/**
 * @swagger
 * /api/equipment:
 *   get:
 *     summary: Lấy danh sách thiết bị
 *     tags: [Equipment]
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/', equipmentController.getAll);

/**
 * @swagger
 * /api/equipment:
 *   post:
 *     summary: Tạo thiết bị mới
 *     tags: [Equipment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thiết bị thành công
 */
router.post('/', equipmentController.create);

export default router;
```

### Bước 5: Đăng ký Router trong server.js

**File:** `server.js`

```javascript
import equipmentRouter from './src/routers/equipment.router.js';

// ... existing code ...

// Thêm route mới
app.use('/api/equipment', equipmentRouter);
```

### Bước 6: Test API

1. Khởi động server: `npm run dev`
2. Truy cập Swagger: `http://localhost:3000/api-docs`
3. Test các endpoint mới

---

## ✅ Best Practices

### 1. **Cấu trúc Code**
- Luôn tuân theo pattern: **Router → Controller → Service → Database**
- Service chứa business logic, Controller chỉ xử lý request/response
- Sử dụng `try-catch` trong Controller và pass error vào `next(error)`

### 2. **Import/Export**
```javascript
// ✅ Đúng - Named export cho controller
export const userController = { ... };

// ✅ Đúng - Default export cho service
export default { getAllUsers, createUser };

// ⚠️ Lưu ý: Khi import phải khớp với cách export
import { userController } from './controllers/user.controller.js';
import userService from './services/user.service.js';
```

### 3. **File Extensions**
- **Luôn thêm `.js`** khi import: `from './file.js'` (bắt buộc với ES Modules)

### 4. **Environment Variables**
- Không bao giờ commit file `.env`
- Lưu các giá trị nhạy cảm (JWT_SECRET, DATABASE_URL) vào `.env`

### 5. **Swagger Documentation**
- Cú pháp YAML cần chính xác (dấu `:` và thụt lề)
- Luôn thêm docs cho mỗi endpoint mới

### 6. **Database Operations**
- Sử dụng Prisma cho tất cả operations
- Luôn include relations khi cần: `include: { role: true }`

### 7. **Error Handling**
```javascript
// ✅ Trong Service - throw Error
if (!user) throw new Error('User not found');

// ✅ Trong Controller - catch và forward
try {
  // ...
} catch (error) {
  next(error);
}
```

### 8. **Response Format**
Sử dụng helper functions:
```javascript
import { responseSuccess, responseError } from "../common/helpers/function.helper.js";

const response = responseSuccess(data, "Success message", 200);
```

---

## 📞 Liên hệ & Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Check Swagger docs tại `/api-docs`
2. Review code examples trong README
3. Liên hệ team lead

---

## 🎯 Roadmap

- [ ] Thêm middleware authentication cho protected routes
- [ ] Implement role-based authorization
- [ ] Thêm validation cho request body
- [ ] Setup error handling middleware
- [ ] Thêm logging system
- [ ] Unit tests và integration tests

---

**Happy Coding! 🚀**
