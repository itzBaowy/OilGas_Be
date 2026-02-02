import { Server } from 'socket.io';

let io;
// Map để lưu userId -> { socketId, deviceId }
const userDeviceMap = new Map();

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        
        // Client gửi userId và deviceId khi kết nối
        socket.on('register_user', ({ userId, deviceId }) => {
            if (userId) {
                // Kiểm tra nếu user đã có socket từ device khác
                const existingData = userDeviceMap.get(userId);
                if (existingData && existingData.deviceId !== deviceId) {
                    // Chỉ force logout nếu deviceId khác nhau (login từ browser/device khác)
                    const existingSocket = io.sockets.sockets.get(existingData.socketId);
                    if (existingSocket) {
                        console.log(`Force logout user ${userId} from device ${existingData.deviceId} (socket ${existingData.socketId})`);
                        existingSocket.emit('force_logout', {
                            message: 'Your account has been logged in from another device'
                        });
                        existingSocket.disconnect(true);
                    }
                } else if (existingData && existingData.deviceId === deviceId) {
                    console.log(`User ${userId} reconnected from same device ${deviceId}, updating socket`);
                }
                
                // Lưu userId, deviceId và socketId vào map
                socket.userId = userId;
                socket.deviceId = deviceId;
                userDeviceMap.set(userId, { socketId: socket.id, deviceId });
                console.log(`User ${userId} registered with socket ${socket.id}, device ${deviceId}`);
            }
        });
        
        // Lắng nghe sự kiện send_message từ client
        socket.on('send_message', (message) => {
            console.log('Received message:', message);
            // Gửi lại tin nhắn cho tất cả clients
            io.emit('receive_message', message);
        });
        
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // Xóa khỏi map khi disconnect (chỉ xóa nếu socket id khớp)
            if (socket.userId) {
                const existingData = userDeviceMap.get(socket.userId);
                if (existingData && existingData.socketId === socket.id) {
                    userDeviceMap.delete(socket.userId);
                    console.log(`Removed user ${socket.userId} from map`);
                }
            }
        });
    });
}

export const getIO = () => io;

export const getUserDeviceMap = () => userDeviceMap;