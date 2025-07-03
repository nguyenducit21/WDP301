import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './Notification.css';

const Notification = () => {
    const [notifications, setNotifications] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Yêu cầu quyền thông báo từ browser
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Kết nối WebSocket
        const newSocket = io('http://localhost:3000');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to WebSocket server');
            setIsConnected(true);

            // Join waiter room
            newSocket.emit('join-waiter-room');
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            setIsConnected(false);
        });

        // Lắng nghe thông báo reservation mới
        newSocket.on('new_reservation', (data) => {
            console.log('Received new reservation notification:', data);

            const newNotification = {
                id: Date.now(),
                type: 'new_reservation',
                title: '🆕 Đặt bàn mới',
                message: `Khách hàng ${data.reservation.customer_name} vừa đặt bàn`,
                data: data.reservation,
                timestamp: new Date(),
                read: false
            };

            setNotifications(prev => [newNotification, ...prev]);

            // Hiển thị toast notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Đặt bàn mới', {
                    body: `Khách hàng ${data.reservation.customer_name} vừa đặt bàn ${data.reservation.tables}`,
                    icon: '/favicon.ico'
                });
            }
        });

        // Cleanup
        return () => {
            newSocket.close();
        };
    }, []);

    const markAsRead = (notificationId) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId
                    ? { ...notif, read: true }
                    : notif
            )
        );
    };

    const removeNotification = (notificationId) => {
        setNotifications(prev =>
            prev.filter(notif => notif.id !== notificationId)
        );
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="notification-container">
            {/* Notification Bell */}
            <div className="notification-bell">
                <div className="bell-icon" onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}>
                    🔔
                    {unreadCount > 0 && (
                        <span className="notification-badge">{unreadCount}</span>
                    )}
                </div>

                {/* Connection Status */}
                <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                    {isConnected ? '🟢' : '🔴'}
                </div>
            </div>

            {/* Notification Panel */}
            {notifications.length > 0 && (
                <div className="notification-panel">
                    <div className="notification-header">
                        <h3>Thông báo ({unreadCount} mới)</h3>
                        <button
                            className="clear-all-btn"
                            onClick={() => setNotifications([])}
                        >
                            Xóa tất cả
                        </button>
                    </div>

                    <div className="notification-list">
                        {notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <div className="notification-content">
                                    <div className="notification-title">
                                        {notification.title}
                                    </div>
                                    <div className="notification-message">
                                        {notification.message}
                                    </div>
                                    {notification.data && (
                                        <div className="notification-details">
                                            <p><strong>Bàn:</strong> {notification.data.tables}</p>
                                            <p><strong>Số khách:</strong> {notification.data.guest_count}</p>
                                            <p><strong>Thời gian:</strong> {notification.data.slot_time}</p>
                                            <p><strong>Ngày:</strong> {formatDateTime(notification.data.date)}</p>
                                            {notification.data.pre_order_items && notification.data.pre_order_items.length > 0 && (
                                                <p><strong>Đặt trước:</strong> {notification.data.pre_order_items.length} món</p>
                                            )}
                                        </div>
                                    )}
                                    <div className="notification-time">
                                        {formatDateTime(notification.timestamp)}
                                    </div>
                                </div>

                                <button
                                    className="remove-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeNotification(notification.id);
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notification;
