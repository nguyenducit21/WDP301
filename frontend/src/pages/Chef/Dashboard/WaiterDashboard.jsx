import React, { useState, useEffect } from 'react';
import {
    FaTable,
    FaClipboardList,
    FaClock,
    FaCheckCircle,
    FaExclamationCircle,
    FaUtensils,
    FaBell,
    FaMoneyBillWave
} from 'react-icons/fa';
import axios from '../../utils/axios.customize';
import './WaiterDashboard.css';

const WaiterDashboard = () => {
    const [myTables, setMyTables] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState({
        assignedTables: 0,
        activeOrders: 0,
        completedOrders: 0,
        totalTips: 0,
        averageServiceTime: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWaiterData();
        fetchMyOrders();
        fetchNotifications();
    }, []);

    const fetchWaiterData = async () => {
        try {
            const response = await axios.get('/dashboard/waiter');
            if (response.data.success) {
                setStats(response.data.data);

                // Simulate table data - in real app, this would come from API
                setMyTables([
                    { id: 1, number: 'Bàn 1', status: 'occupied', customers: 4, orderTime: '19:30', orderValue: 450000 },
                    { id: 2, number: 'Bàn 3', status: 'available', customers: 0, orderTime: null, orderValue: 0 },
                    { id: 3, number: 'Bàn 5', status: 'occupied', customers: 2, orderTime: '20:15', orderValue: 320000 },
                    { id: 4, number: 'Bàn 7', status: 'reserved', customers: 0, orderTime: '21:00', orderValue: 0 },
                    { id: 5, number: 'Bàn 9', status: 'occupied', customers: 6, orderTime: '19:45', orderValue: 680000 }
                ]);
            } else {
                console.error('Failed to fetch waiter stats:', response.data.message);
                setStats({
                    assignedTables: 0,
                    activeOrders: 0,
                    completedOrders: 0,
                    totalTips: 0,
                    averageServiceTime: 0
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching waiter data:', error);
            setStats({
                assignedTables: 0,
                activeOrders: 0,
                completedOrders: 0,
                totalTips: 0,
                averageServiceTime: 0
            });
            setLoading(false);
        }
    };

    const fetchMyOrders = async () => {
        try {
            setTimeout(() => {
                setMyOrders([
                    {
                        id: '#1234',
                        table: 'Bàn 1',
                        status: 'preparing',
                        items: ['Phở Bò', 'Cơm Tấm'],
                        time: '5 phút trước',
                        priority: 'high'
                    },
                    {
                        id: '#1235',
                        table: 'Bàn 5',
                        status: 'ready',
                        items: ['Bánh Mì', 'Cà Phê'],
                        time: '2 phút trước',
                        priority: 'urgent'
                    },
                    {
                        id: '#1236',
                        table: 'Bàn 9',
                        status: 'pending',
                        items: ['Bún Bò Huế', 'Chè'],
                        time: '8 phút trước',
                        priority: 'normal'
                    },
                    {
                        id: '#1237',
                        table: 'Bàn 1',
                        status: 'served',
                        items: ['Nước Ngọt'],
                        time: '15 phút trước',
                        priority: 'normal'
                    }
                ]);
            }, 800);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            setTimeout(() => {
                setNotifications([
                    { id: 1, type: 'order_ready', message: 'Đơn hàng #1235 đã sẵn sàng phục vụ', time: '2 phút trước', urgent: true },
                    { id: 2, type: 'table_request', message: 'Bàn 1 yêu cầu thêm nước', time: '5 phút trước', urgent: false },
                    { id: 3, type: 'reservation', message: 'Bàn 7 có khách đặt lúc 21:00', time: '10 phút trước', urgent: false },
                    { id: 4, type: 'payment', message: 'Bàn 3 yêu cầu thanh toán', time: '12 phút trước', urgent: true }
                ]);
            }, 600);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const getTableStatusColor = (status) => {
        switch (status) {
            case 'available': return 'success';
            case 'occupied': return 'warning';
            case 'reserved': return 'info';
            case 'cleaning': return 'secondary';
            default: return 'secondary';
        }
    };

    const getTableStatusText = (status) => {
        switch (status) {
            case 'available': return 'Trống';
            case 'occupied': return 'Có khách';
            case 'reserved': return 'Đã đặt';
            case 'cleaning': return 'Đang dọn';
            default: return status;
        }
    };

    const getOrderStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'preparing': return 'info';
            case 'ready': return 'success';
            case 'served': return 'primary';
            default: return 'secondary';
        }
    };

    const getOrderStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Chờ xử lý';
            case 'preparing': return 'Đang chuẩn bị';
            case 'ready': return 'Sẵn sàng';
            case 'served': return 'Đã phục vụ';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="waiter-dashboard">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="waiter-dashboard">
            <div className="dashboard-header">
                <h1>Dashboard Phục Vụ</h1>
                <p>Quản lý bàn và đơn hàng của bạn</p>
            </div>

            {/* Waiter Stats */}
            <div className="waiter-stats-grid">
                <div className="waiter-stat-card tables">
                    <div className="stat-icon">
                        <FaTable />
                    </div>
                    <div className="stat-content">
                        <h3>Bàn Được Giao</h3>
                        <p className="stat-number">{stats.assignedTables}</p>
                        <span className="stat-detail">Đang phục vụ</span>
                    </div>
                </div>

                <div className="waiter-stat-card orders">
                    <div className="stat-icon">
                        <FaClipboardList />
                    </div>
                    <div className="stat-content">
                        <h3>Đơn Hàng Hiện Tại</h3>
                        <p className="stat-number">{stats.activeOrders}</p>
                        <span className="stat-detail">{stats.completedOrders} đã hoàn thành</span>
                    </div>
                </div>

                <div className="waiter-stat-card tips">
                    <div className="stat-icon">
                        <FaMoneyBillWave />
                    </div>
                    <div className="stat-content">
                        <h3>Tips Hôm Nay</h3>
                        <p className="stat-number">{formatCurrency(stats.totalTips)}</p>
                        <span className="stat-detail">Từ khách hàng</span>
                    </div>
                </div>

                <div className="waiter-stat-card time">
                    <div className="stat-icon">
                        <FaClock />
                    </div>
                    <div className="stat-content">
                        <h3>Thời Gian Phục Vụ TB</h3>
                        <p className="stat-number">{stats.averageServiceTime} phút</p>
                        <span className="stat-detail">Rất tốt!</span>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="waiter-notifications">
                <h2>
                    <FaBell /> Thông Báo Quan Trọng
                </h2>
                <div className="notifications-list">
                    {notifications.map(notification => (
                        <div key={notification.id} className={`notification-item ${notification.urgent ? 'urgent' : ''}`}>
                            <div className="notification-content">
                                <p>{notification.message}</p>
                                <span className="notification-time">{notification.time}</span>
                            </div>
                            {notification.urgent && <FaExclamationCircle className="urgent-icon" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="waiter-content-grid">
                {/* My Tables */}
                <div className="my-tables">
                    <h2>Bàn Của Tôi</h2>
                    <div className="tables-grid">
                        {myTables.map(table => (
                            <div key={table.id} className={`table-card ${table.status}`}>
                                <div className="table-header">
                                    <h3>{table.number}</h3>
                                    <span className={`table-status ${getTableStatusColor(table.status)}`}>
                                        {getTableStatusText(table.status)}
                                    </span>
                                </div>
                                <div className="table-details">
                                    {table.customers > 0 && (
                                        <p>👥 {table.customers} khách</p>
                                    )}
                                    {table.orderTime && (
                                        <p>🕐 {table.orderTime}</p>
                                    )}
                                    {table.orderValue > 0 && (
                                        <p>💰 {formatCurrency(table.orderValue)}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Orders */}
                <div className="my-orders">
                    <h2>Đơn Hàng Của Tôi</h2>
                    <div className="orders-list">
                        {myOrders.map(order => (
                            <div key={order.id} className={`order-item ${order.priority}`}>
                                <div className="order-header">
                                    <span className="order-id">{order.id}</span>
                                    <span className="order-table">{order.table}</span>
                                    <span className={`order-status ${getOrderStatusColor(order.status)}`}>
                                        {getOrderStatusText(order.status)}
                                    </span>
                                </div>
                                <div className="order-items">
                                    <FaUtensils />
                                    <span>{order.items.join(', ')}</span>
                                </div>
                                <div className="order-time">
                                    <FaClock />
                                    <span>{order.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="waiter-quick-actions">
                <h2>Thao Tác Nhanh</h2>
                <div className="quick-actions-grid">
                    <button className="quick-action-btn">
                        <FaTable />
                        <span>Quản Lý Bàn</span>
                    </button>
                    <button className="quick-action-btn">
                        <FaClipboardList />
                        <span>Tạo Đơn Hàng</span>
                    </button>
                    <button className="quick-action-btn">
                        <FaCheckCircle />
                        <span>Xác Nhận Phục Vụ</span>
                    </button>
                    <button className="quick-action-btn">
                        <FaMoneyBillWave />
                        <span>Thanh Toán</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WaiterDashboard;
