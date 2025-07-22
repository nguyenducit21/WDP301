import React, { useState, useEffect } from 'react';
import {
    FaUtensils,
    FaClock,
    FaCheckCircle,
    FaExclamationTriangle,
    FaFire,
    FaListUl,
    FaBoxes,
    FaChartLine
} from 'react-icons/fa';
import axios from '../../utils/axios.customize';
import './KitchenStaffDashboard.css';

const KitchenStaffDashboard = () => {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [preparingOrders, setPreparingOrders] = useState([]);
    const [completedOrders, setCompletedOrders] = useState([]);
    const [inventoryAlerts, setInventoryAlerts] = useState([]);
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingCount: 0,
        preparingCount: 0,
        completedToday: 0,
        averagePrepTime: 0,
        urgentOrders: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchKitchenData();
        fetchInventoryAlerts();
        // Set up real-time updates
        const interval = setInterval(fetchKitchenData, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchKitchenData = async () => {
        try {
            const response = await axios.get('/dashboard/kitchen-staff');
            if (response.data.success) {
                setStats(response.data.data);

                // Simulate order data - in real app, this would come from API
                setPendingOrders([
                    {
                        id: '#1234',
                        table: 'Bàn 5',
                        items: [
                            { name: 'Phở Bò Tái', quantity: 2, prepTime: 15 },
                            { name: 'Bánh Mì Thịt', quantity: 1, prepTime: 5 }
                        ],
                        orderTime: '20:15',
                        priority: 'high',
                        waitTime: 8
                    },
                    {
                        id: '#1235',
                        table: 'Bàn 2',
                        items: [
                            { name: 'Cơm Tấm Sườn', quantity: 1, prepTime: 12 },
                            { name: 'Chả Cá', quantity: 1, prepTime: 18 }
                        ],
                        orderTime: '20:20',
                        priority: 'urgent',
                        waitTime: 3
                    },
                    {
                        id: '#1236',
                        table: 'Bàn 8',
                        items: [
                            { name: 'Bún Bò Huế', quantity: 3, prepTime: 20 }
                        ],
                        orderTime: '20:22',
                        priority: 'normal',
                        waitTime: 1
                    }
                ]);

                setPreparingOrders([
                    {
                        id: '#1230',
                        table: 'Bàn 1',
                        items: [
                            { name: 'Gà Nướng', quantity: 1, prepTime: 25, elapsed: 15 }
                        ],
                        startTime: '20:05',
                        estimatedReady: '20:30'
                    },
                    {
                        id: '#1231',
                        table: 'Bàn 6',
                        items: [
                            { name: 'Lẩu Thái', quantity: 1, prepTime: 30, elapsed: 20 }
                        ],
                        startTime: '20:00',
                        estimatedReady: '20:30'
                    }
                ]);

                setCompletedOrders([
                    { id: '#1228', table: 'Bàn 3', completedTime: '20:10', items: ['Phở Gà', 'Chè'] },
                    { id: '#1229', table: 'Bàn 7', completedTime: '20:12', items: ['Bánh Cuốn'] },
                    { id: '#1227', table: 'Bàn 4', completedTime: '20:08', items: ['Cơm Chiên', 'Canh Chua'] }
                ]);
            } else {
                console.error('Failed to fetch kitchen stats:', response.data.message);
                setStats({
                    totalOrders: 0,
                    pendingCount: 0,
                    preparingCount: 0,
                    completedToday: 0,
                    averagePrepTime: 0,
                    urgentOrders: 0
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching kitchen data:', error);
            setStats({
                totalOrders: 0,
                pendingCount: 0,
                preparingCount: 0,
                completedToday: 0,
                averagePrepTime: 0,
                urgentOrders: 0
            });
            setLoading(false);
        }
    };

    const fetchInventoryAlerts = async () => {
        try {
            setTimeout(() => {
                setInventoryAlerts([
                    { id: 1, item: 'Thịt Bò', level: 'low', remaining: '2kg', message: 'Sắp hết thịt bò' },
                    { id: 2, item: 'Bánh Phở', level: 'critical', remaining: '5 suất', message: 'Bánh phở sắp hết' },
                    { id: 3, item: 'Rau Sống', level: 'low', remaining: '1kg', message: 'Cần bổ sung rau sống' }
                ]);
            }, 800);
        } catch (error) {
            console.error('Error fetching inventory alerts:', error);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'urgent';
            case 'high': return 'high';
            case 'normal': return 'normal';
            default: return 'normal';
        }
    };

    const getPriorityText = (priority) => {
        switch (priority) {
            case 'urgent': return 'Khẩn cấp';
            case 'high': return 'Cao';
            case 'normal': return 'Bình thường';
            default: return priority;
        }
    };

    const getInventoryLevelColor = (level) => {
        switch (level) {
            case 'critical': return 'critical';
            case 'low': return 'warning';
            case 'normal': return 'success';
            default: return 'normal';
        }
    };

    const formatTime = (minutes) => {
        return `${minutes} phút`;
    };

    const getProgressPercentage = (elapsed, total) => {
        return Math.min((elapsed / total) * 100, 100);
    };

    if (loading) {
        return (
            <div className="kitchen-dashboard">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="kitchen-dashboard">
            <div className="dashboard-header">
                <h1>Dashboard Bếp</h1>
                <p>Quản lý đơn hàng và chế biến món ăn</p>
            </div>

            {/* Kitchen Stats */}
            <div className="kitchen-stats-grid">
                <div className="kitchen-stat-card total">
                    <div className="stat-icon">
                        <FaListUl />
                    </div>
                    <div className="stat-content">
                        <h3>Tổng Đơn Hôm Nay</h3>
                        <p className="stat-number">{stats.totalOrders}</p>
                        <span className="stat-detail">{stats.completedToday} đã hoàn thành</span>
                    </div>
                </div>

                <div className="kitchen-stat-card pending">
                    <div className="stat-icon">
                        <FaClock />
                    </div>
                    <div className="stat-content">
                        <h3>Đang Chờ</h3>
                        <p className="stat-number">{stats.pendingCount}</p>
                        <span className="stat-detail">Cần xử lý ngay</span>
                    </div>
                </div>

                <div className="kitchen-stat-card preparing">
                    <div className="stat-icon">
                        <FaFire />
                    </div>
                    <div className="stat-content">
                        <h3>Đang Chế Biến</h3>
                        <p className="stat-number">{stats.preparingCount}</p>
                        <span className="stat-detail">Đang nấu</span>
                    </div>
                </div>

                <div className="kitchen-stat-card time">
                    <div className="stat-icon">
                        <FaChartLine />
                    </div>
                    <div className="stat-content">
                        <h3>Thời Gian TB</h3>
                        <p className="stat-number">{stats.averagePrepTime} phút</p>
                        <span className="stat-detail">Chế biến trung bình</span>
                    </div>
                </div>
            </div>

            {/* Inventory Alerts */}
            {inventoryAlerts.length > 0 && (
                <div className="inventory-alerts">
                    <h2>
                        <FaExclamationTriangle /> Cảnh Báo Nguyên Liệu
                    </h2>
                    <div className="alerts-list">
                        {inventoryAlerts.map(alert => (
                            <div key={alert.id} className={`alert-item ${getInventoryLevelColor(alert.level)}`}>
                                <FaBoxes className="alert-icon" />
                                <div className="alert-content">
                                    <span className="alert-item-name">{alert.item}</span>
                                    <span className="alert-message">{alert.message}</span>
                                    <span className="alert-remaining">Còn lại: {alert.remaining}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="kitchen-content-grid">
                {/* Pending Orders */}
                <div className="pending-orders">
                    <h2>Đơn Hàng Chờ Xử Lý ({stats.pendingCount})</h2>
                    <div className="orders-list">
                        {pendingOrders.map(order => (
                            <div key={order.id} className={`order-card ${getPriorityColor(order.priority)}`}>
                                <div className="order-header">
                                    <span className="order-id">{order.id}</span>
                                    <span className="order-table">{order.table}</span>
                                    <span className={`order-priority ${getPriorityColor(order.priority)}`}>
                                        {getPriorityText(order.priority)}
                                    </span>
                                </div>
                                <div className="order-items">
                                    {order.items.map((item, index) => (
                                        <div key={index} className="order-item">
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-quantity">x{item.quantity}</span>
                                            <span className="item-time">{formatTime(item.prepTime)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="order-footer">
                                    <span className="order-time">Đặt lúc: {order.orderTime}</span>
                                    <span className="wait-time">Chờ: {order.waitTime} phút</span>
                                    <button className="start-cooking-btn">
                                        <FaFire /> Bắt Đầu Nấu
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Preparing Orders */}
                <div className="preparing-orders">
                    <h2>Đang Chế Biến ({stats.preparingCount})</h2>
                    <div className="orders-list">
                        {preparingOrders.map(order => (
                            <div key={order.id} className="order-card preparing">
                                <div className="order-header">
                                    <span className="order-id">{order.id}</span>
                                    <span className="order-table">{order.table}</span>
                                    <span className="estimated-time">Dự kiến: {order.estimatedReady}</span>
                                </div>
                                <div className="order-items">
                                    {order.items.map((item, index) => (
                                        <div key={index} className="order-item">
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-quantity">x{item.quantity}</span>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${getProgressPercentage(item.elapsed, item.prepTime)}%` }}
                                                ></div>
                                            </div>
                                            <span className="progress-text">
                                                {item.elapsed}/{item.prepTime} phút
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="order-footer">
                                    <span className="start-time">Bắt đầu: {order.startTime}</span>
                                    <button className="complete-btn">
                                        <FaCheckCircle /> Hoàn Thành
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recently Completed */}
            <div className="completed-orders">
                <h2>Đã Hoàn Thành Gần Đây</h2>
                <div className="completed-list">
                    {completedOrders.map(order => (
                        <div key={order.id} className="completed-item">
                            <span className="order-id">{order.id}</span>
                            <span className="order-table">{order.table}</span>
                            <span className="order-items">{order.items.join(', ')}</span>
                            <span className="completed-time">Hoàn thành: {order.completedTime}</span>
                            <FaCheckCircle className="completed-icon" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="kitchen-quick-actions">
                <h2>Thao Tác Nhanh</h2>
                <div className="quick-actions-grid">
                    <button className="quick-action-btn">
                        <FaUtensils />
                        <span>Xem Menu</span>
                    </button>
                    <button className="quick-action-btn">
                        <FaBoxes />
                        <span>Kiểm Tra Kho</span>
                    </button>
                    <button className="quick-action-btn">
                        <FaChartLine />
                        <span>Báo Cáo Bếp</span>
                    </button>
                    <button className="quick-action-btn">
                        <FaClock />
                        <span>Lịch Sử Đơn</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KitchenStaffDashboard;
