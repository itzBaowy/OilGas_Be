import { Server } from 'socket.io';

let io;
// Map để lưu userId -> socketId
const userSocketMap = new Map();

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        
        // Client gửi userId khi kết nối
        socket.on('register_user', (userId) => {
            if (userId) {
                // Kiểm tra nếu user đã có socket khác
                const existingSocketId = userSocketMap.get(userId);
                if (existingSocketId && existingSocketId !== socket.id) {
                    const existingSocket = io.sockets.sockets.get(existingSocketId);
                    if (existingSocket) {
                        console.log(`Force logout user ${userId} from old socket ${existingSocketId}`);
                        existingSocket.emit('force_logout', {
                            message: 'Your account has been logged in from another device'
                        });
                        existingSocket.disconnect(true);
                    }
                }
                
                // Lưu userId vào socket và map
                socket.userId = userId;
                userSocketMap.set(userId, socket.id);
                console.log(`User ${userId} registered with socket ${socket.id}`);
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
            // Xóa khỏi map khi disconnect
            if (socket.userId) {
                userSocketMap.delete(socket.userId);
            }
        });
    });
}

export const getIO = () => io;

export const getUserSocketMap = () => userSocketMap;