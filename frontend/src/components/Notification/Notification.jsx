import React, { useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import axios from '../../utils/axios.customize';
import './Notification.css';

const Notification = () => {
    const [notifications, setNotifications] = useState([]);
    const [orderAssignments, setOrderAssignments] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineStaff, setOnlineStaff] = useState([]);
    const { user } = useContext(AuthContext);

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

            // Join staff room nếu là nhân viên
            if (user?.user?.role && ['waiter', 'kitchen_staff', 'manager', 'admin'].includes(user.user.role)) {
                newSocket.emit('join-staff-room', {
                    userId: user.user.id,
                    role: user.user.role,
                    fullName: user.user.full_name || user.user.username
                });
            }
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

        // Lắng nghe đơn hàng assignment mới
        newSocket.on('new_order_assignment', (data) => {
            console.log('Received new order assignment:', data);

            const newAssignment = {
                id: data.assignment_id,
                type: 'new_order',
                title: '🔔 Đơn hàng mới',
                message: `Khách hàng ${data.order_details.customer_name} - Bàn ${data.order_details.tables}`,
                data: data,
                timestamp: new Date(),
                status: 'waiting',
                priority: data.priority
            };

            setOrderAssignments(prev => [newAssignment, ...prev]);

            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Đơn hàng mới cần xử lý', {
                    body: `${data.order_details.customer_name} - ${data.order_details.tables}`,
                    icon: '/favicon.ico',
                    tag: data.assignment_id // Prevent duplicate notifications
                });
            }
        });

        // Đơn hàng đã được nhận
        newSocket.on('order_claimed', (data) => {
            setOrderAssignments(prev => prev.map(assignment => 
                assignment.id === data.assignment_id 
                    ? { ...assignment, status: 'processing', assigned_to: data.assigned_to }
                    : assignment
            ));
        });

        // Đơn hàng được trả lại
        newSocket.on('order_released', (data) => {
            setOrderAssignments(prev => prev.map(assignment => 
                assignment.id === data.assignment_id 
                    ? { ...assignment, status: 'waiting', assigned_to: null }
                    : assignment
            ));

            // Thông báo có đơn hàng được trả lại
            const notification = {
                id: Date.now(),
                type: 'order_released',
                title: '🔄 Đơn hàng được trả lại',
                message: `Đơn hàng đã được trả lại và có thể nhận lại`,
                timestamp: new Date(),
                read: false
            };

            setNotifications(prev => [notification, ...prev]);
        });

        // Đơn hàng hoàn thành
        newSocket.on('order_completed', (data) => {
            setOrderAssignments(prev => prev.filter(assignment => 
                assignment.id !== data.assignment_id
            ));
        });

        // Danh sách staff online
        newSocket.on('online_staff_list', (staffList) => {
            setOnlineStaff(staffList);
        });

        newSocket.on('staff_joined', (data) => {
            setOnlineStaff(prev => [...prev, data]);
        });

        newSocket.on('staff_left', (data) => {
            setOnlineStaff(prev => prev.filter(staff => staff.userId !== data.userId));
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
