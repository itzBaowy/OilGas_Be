# 🔔 Notification System với Socket.IO

Hệ thống thông báo realtime cho Oil & Gas Management System.

## 📋 Tổng quan

- **Model**: `Notification` trong Prisma schema
- **Socket.IO**: Gửi thông báo realtime đến users
- **REST API**: Quản lý notifications (get, read, delete)
- **Helper Functions**: Dễ dàng gửi notifications từ bất kỳ service nào

## 🗄️ Database Schema

```prisma
model Notification {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  recipientId String   @db.ObjectId
  recipient   User     @relation("RecipientNotifications", fields: [recipientId], references: [id])
  title       String
  message     String
  type        String   @default("INFO") // INFO, SUCCESS, WARNING, ERROR, SYSTEM
  category    String?  // USER, ROLE, EQUIPMENT, WAREHOUSE, INVENTORY, MAINTENANCE, SYSTEM
  relatedId   String?  // ID của entity liên quan
  link        String?  // Deep link đến trang chi tiết
  isRead      Boolean  @default(false)
  readAt      DateTime?
  createdBy   String?  @db.ObjectId
  creator     User?    @relation("CreatorNotifications", fields: [createdBy], references: [id])
  createdAt   DateTime @default(now())
}
```

## 📡 REST API Endpoints

### 1. Lấy danh sách notifications
```
GET /api/notifications?page=1&pageSize=10&filters={"isRead":false}
Authorization: Bearer <token>
```

### 2. Đếm số notifications chưa đọc
```
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

### 3. Đánh dấu notification đã đọc
```
PUT /api/notifications/:notificationId/read
Authorization: Bearer <token>
```

### 4. Đánh dấu tất cả đã đọc
```
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

### 5. Xóa notification
```
DELETE /api/notifications/:notificationId
Authorization: Bearer <token>
```

## 🔌 Socket.IO Events

### Client → Server

#### 1. Register User
```javascript
socket.emit('register_user', {
  userId: 'user_id_here',
  deviceId: 'device_uuid_here'
});
```

### Server → Client

#### 1. New Notification
```javascript
socket.on('new_notification', (notification) => {
  console.log('New notification:', notification);
  // notification = {
  //   id, title, message, type, category, 
  //   relatedId, link, isRead, createdAt, creator
  // }
});
```

#### 2. Force Logout
```javascript
socket.on('force_logout', (data) => {
  console.log(data.message);
  // Redirect to login page
});
```

## 💻 Sử dụng từ Backend Service

### Import Helper Functions
```javascript
import {
  notifyUserCreated,
  notifyUserUpdated,
  notifyUserDeleted,
  notifyRoleUpdated,
  notifyMaintenanceRequired,
  notifyLowStock,
  notifySystemMessage,
} from '../common/helpers/notification.helper.js';
```

### Ví dụ: Gửi notification khi tạo user
```javascript
// Trong user.service.js
const newUser = await prisma.user.create({ ... });

// Gửi welcome notification
await notifyUserCreated(newUser, req.user.id);
```

### Ví dụ: Gửi notification cho nhiều users
```javascript
// Thông báo equipment cần bảo trì
const supervisorIds = ['id1', 'id2', 'id3'];
await notifyMaintenanceRequired(supervisorIds, equipment);
```

### Ví dụ: Tạo custom notification
```javascript
import { notificationService } from '../services/notification.service.js';

await notificationService.createNotification({
  recipientId: userId,
  title: 'Custom Notification',
  message: 'This is a custom message',
  type: 'INFO', // INFO, SUCCESS, WARNING, ERROR, SYSTEM
  category: 'EQUIPMENT',
  relatedId: equipmentId,
  link: `/equipment/${equipmentId}`,
  createdBy: currentUserId,
});
```

## 🎨 Frontend Implementation

### 1. Connect Socket.IO
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
});

// Register user khi login
socket.emit('register_user', {
  userId: user.id,
  deviceId: getDeviceId(), // UUID từ localStorage
});
```

### 2. Listen for Notifications
```javascript
socket.on('new_notification', (notification) => {
  // Show toast/notification
  toast.success(notification.title, notification.message);
  
  // Update notification badge count
  setUnreadCount(prev => prev + 1);
  
  // Add to notification list
  setNotifications(prev => [notification, ...prev]);
});
```

### 3. Fetch Notifications
```javascript
const fetchNotifications = async () => {
  const response = await api.get('/api/notifications', {
    params: { page: 1, pageSize: 20 }
  });
  setNotifications(response.data.data.items);
};
```

### 4. Mark as Read
```javascript
const markAsRead = async (notificationId) => {
  await api.put(`/api/notifications/${notificationId}/read`);
  // Update local state
};
```

## 📊 Notification Types & Categories

### Types (type)
- `INFO` - Thông tin chung
- `SUCCESS` - Thành công
- `WARNING` - Cảnh báo
- `ERROR` - Lỗi
- `SYSTEM` - Hệ thống

### Categories (category)
- `USER` - Quản lý user
- `ROLE` - Quản lý role/permission
- `EQUIPMENT` - Thiết bị
- `WAREHOUSE` - Kho
- `INVENTORY` - Tồn kho
- `MAINTENANCE` - Bảo trì
- `SYSTEM` - Hệ thống

## 🔧 Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

## 📝 Notes

1. **User Authentication**: Tất cả API endpoints yêu cầu JWT token
2. **Socket Rooms**: Mỗi user tự động join room theo userId
3. **Device Management**: Hệ thống hỗ trợ force logout khi login từ device khác
4. **Realtime**: Notifications được gửi ngay lập tức qua Socket.IO
5. **Persistence**: Tất cả notifications được lưu trong database

## 🚀 Testing

### Test Socket Connection
```javascript
// Test connection
const socket = io('http://localhost:3000');
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Register user
socket.emit('register_user', {
  userId: 'test_user_id',
  deviceId: 'test_device'
});

// Listen for notifications
socket.on('new_notification', console.log);
```

### Test API
```bash
# Get notifications
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/notifications

# Get unread count
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/notifications/unread-count
```

## 🎯 Best Practices

1. **Luôn gửi notification qua helper functions** thay vì gọi trực tiếp service
2. **Cung cấp link** để user có thể navigate đến chi tiết
3. **Sử dụng đúng type và category** để dễ filter và hiển thị
4. **Không spam notifications** - Chỉ gửi những thông báo quan trọng
5. **Clean up old notifications** - Có thể tạo cron job để xóa notifications cũ

## 📚 Related Files

- Schema: `Backend/prisma/schema.prisma`
- Service: `Backend/src/services/notification.service.js`
- Controller: `Backend/src/controllers/notification.controller.js`
- Router: `Backend/src/routers/notification.router.js`
- Socket: `Backend/src/common/socket/init.socket.js`
- Helper: `Backend/src/common/helpers/notification.helper.js`
