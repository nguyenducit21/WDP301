const { Server } = require('socket.io');
let io;
// Map để lưu trữ user sessions (global scope)
const connectedUsers = new Map();

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:5173", // Frontend URL
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('🔌 Socket.io User connected:', socket.id);

        // Khi user join staff room
        socket.on('join-staff-room', (data) => {
            const { userId, role, fullName } = data;

            // Lưu thông tin user
            connectedUsers.set(socket.id, {
                userId,
                role,
                fullName,
                socketId: socket.id,
                joinedAt: new Date()
            });

            // Join room dành cho staff
            socket.join('staff-room');

            console.log(`👥 ${fullName} (${role}) joined staff room`);

            // Thông báo cho các staff khác
            socket.to('staff-room').emit('staff_joined', {
                userId,
                fullName,
                role
            });

            // Gửi danh sách staff online cho user mới
            const onlineStaff = Array.from(connectedUsers.values())
                .filter(user => user.userId !== userId);

            socket.emit('online_staff_list', onlineStaff);
        });

        // Khi user join waiter room (cho reservation notifications)
        socket.on('join-waiter-room', () => {
            socket.join('waiter-room');
            console.log('User joined waiter room:', socket.id);
        });

        // Xử lý khi user disconnect
        socket.on('disconnect', () => {
            const userInfo = connectedUsers.get(socket.id);

            if (userInfo) {
                console.log(`${userInfo.fullName} disconnected`);

                // Thông báo cho các staff khác
                socket.to('staff-room').emit('staff_left', {
                    userId: userInfo.userId,
                    fullName: userInfo.fullName
                });

                // Xóa khỏi map
                connectedUsers.delete(socket.id);
            }
        });

        // Ping-pong để maintain connection
        socket.on('ping', () => {
            socket.emit('pong');
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

const getConnectedUsers = () => {
    return Array.from(connectedUsers.values());
};

module.exports = {
    initializeSocket,
    getIO,
    getConnectedUsers
}; 