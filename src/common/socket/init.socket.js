import { Server } from 'socket.io';

export const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        
        // Lắng nghe sự kiện send_message từ client
        socket.on('send_message', (message) => {
            console.log('Received message:', message);
            // Gửi lại tin nhắn cho tất cả clients
            io.emit('receive_message', message);
        });
        
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
}