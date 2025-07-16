import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../utils/axios.customize';
import './WaiterDashboard.css';

const WaiterDashboard = () => {
    const [stats, setStats] = useState({
        todayReservations: 0,
        activeOrders: 0,
        occupiedTables: 0,
        totalTables: 0,
        pendingReservations: 0,
        confirmedReservations: 0,
        seatedReservations: 0,
        todayRevenue: 0,
        averageOrderValue: 0
    });
    const [recentReservations, setRecentReservations] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsResponse, reservationsResponse, ordersResponse] = await Promise.all([
                axios.get('/reservations/waiter-dashboard'),
                axios.get('/reservations/waiter?limit=5'),
                axios.get('/orders/waiter?limit=5')
            ]);

            if (statsResponse.data.success) {
                setStats(statsResponse.data.data);
            }
            if (reservationsResponse.data.success) {
                setRecentReservations(reservationsResponse.data.data);
            }
            if (ordersResponse.data.success) {
                setRecentOrders(ordersResponse.data.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAction = (action) => {
        switch (action) {
            case 'create-order':
                navigate('/waiter/orders/create');
                break;
            case 'check-in':
                navigate('/waiter/reservations');
                break;
            case 'checkout':
                navigate('/waiter/checkout');
                break;
            case 'tables':
                navigate('/waiter/tables');
                break;
            default:
                break;
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        return timeString.substring(0, 5);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#ff9800';
            case 'confirmed': return '#2196f3';
            case 'seated': return '#4caf50';
            case 'completed': return '#4caf50';
            case 'cancelled': return '#f44336';
            default: return '#757575';
        }
    };

    if (loading) {
        return (
            <div className="waiter-dashboard">
                <div className="loading">Đang tải thống kê...</div>
            </div>
        );
    }

    return (
        <div className="waiter-dashboard">
            <div className="dashboard-header">
                <div className="header-left">
                    <h1>📊 Dashboard</h1>
                    <p className="welcome-text">Chào mừng bạn trở lại! Hôm nay là {new Date().toLocaleDateString('vi-VN')}</p>
                </div>
                <button onClick={fetchDashboardData} className="refresh-btn">
                    🔄 Làm mới
                </button>
            </div>

            {/* Main Stats */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <h3>{stats.todayReservations}</h3>
                        <p>Đặt bàn hôm nay</p>
                        <div className="stat-breakdown">
                            <span className="breakdown-item pending">{stats.pendingReservations} chờ xác nhận</span>
                            <span className="breakdown-item confirmed">{stats.confirmedReservations} đã xác nhận</span>
                            <span className="breakdown-item seated">{stats.seatedReservations} đã ngồi</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🍽️</div>
                    <div className="stat-content">
                        <h3>{stats.activeOrders}</h3>
                        <p>Đơn hàng đang xử lý</p>
                        <div className="stat-trend">
                            <span className="trend-up">↗️ +12% so với hôm qua</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🪑</div>
                    <div className="stat-content">
                        <h3>{stats.occupiedTables}</h3>
                        <p>Bàn đang sử dụng</p>
                        <div className="occupancy-rate">
                            <span>{(stats.occupiedTables / stats.totalTables * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <h3>{stats.todayRevenue.toLocaleString('vi-VN')}đ</h3>
                        <p>Doanh thu hôm nay</p>
                        <div className="avg-order">
                            <span>TB: {stats.averageOrderValue.toLocaleString('vi-VN')}đ/đơn</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>🚀 Thao tác nhanh</h2>
                <div className="action-buttons">
                    <button
                        className="action-btn primary"
                        onClick={() => handleQuickAction('create-order')}
                    >
                        📝 Tạo đơn hàng mới
                    </button>
                    <button
                        className="action-btn"
                        onClick={() => handleQuickAction('check-in')}
                    >
                        ✅ Check-in khách
                    </button>
                    <button
                        className="action-btn"
                        onClick={() => handleQuickAction('checkout')}
                    >
                        💳 Thanh toán
                    </button>
                    <button
                        className="action-btn"
                        onClick={() => handleQuickAction('tables')}
                    >
                        🔄 Chuyển bàn
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
                <div className="activity-section">
                    <h2>📅 Đặt bàn gần đây</h2>
                    <div className="activity-list">
                        {recentReservations.length === 0 ? (
                            <p className="no-data">Không có đặt bàn nào gần đây</p>
                        ) : (
                            recentReservations.map(reservation => (
                                <div key={reservation._id} className="activity-item">
                                    <div className="activity-icon">👤</div>
                                    <div className="activity-content">
                                        <h4>{reservation.contact_name}</h4>
                                        <p>{reservation.guest_count} người - {formatTime(reservation.slot_start_time)}</p>
                                        <span className="activity-time">{formatDate(reservation.date)}</span>
                                    </div>
                                    <div className="activity-status">
                                        <span
                                            className="status-dot"
                                            style={{ backgroundColor: getStatusColor(reservation.status) }}
                                        ></span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="activity-section">
                    <h2>🍽️ Đơn hàng gần đây</h2>
                    <div className="activity-list">
                        {recentOrders.length === 0 ? (
                            <p className="no-data">Không có đơn hàng nào gần đây</p>
                        ) : (
                            recentOrders.map(order => (
                                <div key={order._id} className="activity-item">
                                    <div className="activity-icon">🍽️</div>
                                    <div className="activity-content">
                                        <h4>Bàn {order.table_name}</h4>
                                        <p>{order.item_count} món - {order.total_amount.toLocaleString('vi-VN')}đ</p>
                                        <span className="activity-time">{formatDate(order.created_at)}</span>
                                    </div>
                                    <div className="activity-status">
                                        <span
                                            className="status-dot"
                                            style={{ backgroundColor: getStatusColor(order.status) }}
                                        ></span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* System Status */}
            <div className="system-status">
                <h2>🔧 Trạng thái hệ thống</h2>
                <div className="status-grid">
                    <div className="status-item online">
                        <span className="status-indicator"></span>
                        <span>Hệ thống đặt bàn</span>
                    </div>
                    <div className="status-item online">
                        <span className="status-indicator"></span>
                        <span>Hệ thống thanh toán</span>
                    </div>
                    <div className="status-item online">
                        <span className="status-indicator"></span>
                        <span>Kết nối máy in</span>
                    </div>
                    <div className="status-item online">
                        <span className="status-indicator"></span>
                        <span>Đồng bộ dữ liệu</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaiterDashboard; 