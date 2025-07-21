import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaTable,
    FaClipboardList,
    FaMoneyBillWave,
    FaCalendarAlt,
    FaUtensils,
    FaReceipt,
    FaSync,
    FaFilter,
    FaCalendarDay,
    FaCalendarWeek,
    FaCheckCircle
} from 'react-icons/fa';
import axios from '../../utils/axios.customize';
import './WaiterDashboard.css';

const WaiterDashboard = () => {
    const navigate = useNavigate();
    const [myTables, setMyTables] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [stats, setStats] = useState({
        assignedTables: 0,
        todayOrders: 0,
        todayRevenue: 0,
        activeOrders: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter giống ManagerDashboard
    const [waiterFilter, setWaiterFilter] = useState({
        period: 'today',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchAllData();
    }, [waiterFilter]);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchWaiterData(),
                fetchMyTables(),
                fetchMyOrders()
            ]);
        } catch (err) {
            setError('Lỗi khi tải dữ liệu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchWaiterData = async () => {
        try {
            const params = {
                period: waiterFilter.period,
                startDate: waiterFilter.startDate,
                endDate: waiterFilter.endDate
            };

            const response = await axios.get('/dashboard/waiter', { params });

            if (response.data.success) {
                setStats(response.data.data);
            } else {
                console.error('API error:', response.data.message);
                setError('API error: ' + response.data.message);
            }
        } catch (error) {
            console.error('Network error:', error.response || error);
            setError('Không thể tải dữ liệu: ' + error.message);
        }
    };

    const fetchMyTables = async () => {
        try {
            const response = await axios.get('/dashboard/waiter/my-tables');
            if (response.data.success) {
                setMyTables(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching tables:', error);
        }
    };

    const fetchMyOrders = async () => {
        try {
            const response = await axios.get('/dashboard/waiter/my-orders');
            if (response.data.success) {
                setMyOrders(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    // Event handlers
    const handleRefresh = () => {
        fetchAllData();
    };

    const handlePeriodChange = (period) => {
        const today = new Date();
        let startDate = new Date();
        let endDate = new Date();

        switch (period) {
            case 'today':
                startDate = endDate = new Date();
                break;
            case 'week':
                startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
                break;
            default:
                if (period !== 'custom') return;
        }

        setWaiterFilter(prev => ({
            ...prev,
            period,
            ...(period !== 'custom' && {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            })
        }));
    };

    const handleFilterChange = (key, value) => {
        setWaiterFilter(prev => ({ ...prev, [key]: value }));
    };

    const getPeriodLabel = (period) => {
        const labels = {
            today: 'Hôm nay',
            week: '7 ngày qua',
            month: '30 ngày qua',
            custom: 'Tùy chỉnh'
        };
        return labels[period] || period;
    };

    // Action handlers cho reservations
    const handleConfirmReservation = async (reservationId) => {
        try {
            const response = await axios.patch(`/reservations/${reservationId}/confirm`);
            if (response.data.success) {
                fetchMyOrders();
                alert('Đã xác nhận đặt bàn');
            }
        } catch (error) {
            console.error('Error confirming reservation:', error);
            alert('Lỗi khi xác nhận đặt bàn');
        }
    };

    const handleSeatReservation = async (reservationId) => {
        try {
            const response = await axios.patch(`/reservations/${reservationId}/seat`);
            if (response.data.success) {
                fetchMyOrders();
                fetchMyTables();
                alert('Khách đã vào bàn');
            }
        } catch (error) {
            console.error('Error seating reservation:', error);
            alert('Lỗi khi xử lý khách vào bàn');
        }
    };

    const handleCompleteReservation = async (reservationId) => {
        try {
            const response = await axios.patch(`/reservations/${reservationId}/complete`);
            if (response.data.success) {
                fetchMyOrders();
                fetchMyTables();
                alert('Đã hoàn thành phục vụ');
            }
        } catch (error) {
            console.error('Error completing reservation:', error);
            alert('Lỗi khi hoàn thành phục vụ');
        }
    };

    const handleSeatCustomers = async (reservationId) => {
        try {
            await axios.patch(`/reservations/${reservationId}/seat`);
            fetchMyTables();
        } catch (error) {
            console.error('Error seating customers:', error);
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
            default: return 'secondary';
        }
    };

    const getTableStatusText = (status) => {
        switch (status) {
            case 'available': return 'Trống';
            case 'occupied': return 'Có khách';
            case 'reserved': return 'Đã đặt';
            default: return status;
        }
    };

    // Functions cho reservation status (thay thế order status)
    const getReservationStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'confirmed': return 'info';
            case 'seated': return 'primary';
            case 'cancelled': return 'danger';
            case 'no_show': return 'secondary';
            case 'completed': return 'success';
            default: return 'secondary';
        }
    };

    const getReservationStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Chờ xác nhận';
            case 'confirmed': return 'Đã xác nhận';
            case 'seated': return 'Đang phục vụ';
            case 'cancelled': return 'Đã hủy';
            case 'no_show': return 'Không đến';
            case 'completed': return 'Hoàn thành';
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
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Dashboard Phục Vụ</h1>
                    <p>Quản lý bàn và đơn hàng của bạn</p>
                </div>

                <div className="dashboard-controls">
                    <button onClick={handleRefresh} disabled={loading} className="refresh-btn">
                        <FaSync className={loading ? 'fa-spin' : ''} />
                        {loading ? 'Đang tải...' : 'Làm mới'}
                    </button>
                    {error && <div className="error-message">{error}</div>}
                </div>
            </div>

            {/* Stats với Filter */}
            <div className="stats-section">
                <div className="section-header">
                    <h2>Thống kê phục vụ</h2>
                    <div className="dashboard-filters">
                        <div className="quick-filters">
                            {['today', 'week', 'month', 'custom'].map(period => (
                                <button
                                    key={period}
                                    className={`filter-btn ${waiterFilter.period === period ? 'active' : ''}`}
                                    onClick={() => handlePeriodChange(period)}
                                >
                                    {period === 'today' && <FaCalendarDay />}
                                    {period === 'week' && <FaCalendarWeek />}
                                    {period === 'month' && <FaCalendarAlt />}
                                    {period === 'custom' && <FaFilter />}
                                    {getPeriodLabel(period)}
                                </button>
                            ))}
                        </div>

                        {waiterFilter.period === 'custom' && (
                            <div className="custom-date-range">
                                <input
                                    type="date"
                                    value={waiterFilter.startDate}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                />
                                <span>đến</span>
                                <input
                                    type="date"
                                    value={waiterFilter.endDate}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="waiter-stats-grid">
                    <div className="waiter-stat-card tables">
                        <div className="stat-icon">
                            <FaTable />
                        </div>
                        <div className="stat-content">
                            <h3>Bàn Phụ Trách</h3>
                            <p className="stat-number">{stats.assignedTables}</p>
                            <span className="stat-detail">{myTables.length} đang phục vụ</span>
                        </div>
                    </div>

                    <div className="waiter-stat-card orders">
                        <div className="stat-icon">
                            <FaClipboardList />
                        </div>
                        <div className="stat-content">
                            <h3>Đơn {getPeriodLabel(waiterFilter.period).toLowerCase()}</h3>
                            <p className="stat-number">{stats.todayOrders}</p>
                            <span className="stat-detail">{stats.assignedTables} đang phục vụ</span>
                        </div>
                    </div>

                    <div className="waiter-stat-card earnings">
                        <div className="stat-icon">
                            <FaMoneyBillWave />
                        </div>
                        <div className="stat-content">
                            <h3>Doanh thu {getPeriodLabel(waiterFilter.period).toLowerCase()}</h3>
                            <p className="stat-number">{formatCurrency(stats.todayRevenue)}</p>
                            <span className="stat-detail">Từ các đơn hàng</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="waiter-content-grid">
                {/* Bàn của tôi */}
                <div className="my-tables">
                    <h2>Bàn Của Tôi ({myTables.length})</h2>
                    <div className="tables-grid">
                        {myTables.length > 0 ? myTables.map(table => (
                            <div key={table.id} className={`table-card ${table.status}`}>
                                <div className="table-header">
                                    <h3>{table.name}</h3>
                                    <span className={`table-status ${getTableStatusColor(table.status)}`}>
                                        {getTableStatusText(table.status)}
                                    </span>
                                </div>
                                <div className="table-details">
                                    <p>👥 {table.customers} khách</p>
                                    <p>🕐 {table.orderTime}</p>
                                    {table.currentOrderValue > 0 && (
                                        <p>💰 {formatCurrency(table.currentOrderValue)}</p>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <p className="no-data">Chưa có bàn nào được giao</p>
                        )}
                    </div>
                </div>

                {/* Đặt bàn cần xử lý */}
                <div className="my-orders">
                    <h2>Đặt Bàn Cần Xử Lý ({myOrders.length})</h2>
                    <div className="orders-list">
                        {myOrders.length > 0 ? myOrders.map(order => (
                            <div key={order.id} className={`order-item ${order.priority}`}>
                                <div className="order-header">
                                    <span className="order-id">{order.id}</span>
                                    <span className="order-table">{order.table}</span>
                                    <span className={`order-status ${getReservationStatusColor(order.status)}`}>
                                        {getReservationStatusText(order.status)}
                                    </span>
                                </div>

                                <div className="order-customer-info">
                                    <div className="customer-details">
                                        <h4>Thông tin khách hàng</h4>
                                        <span className="customer-name">👤 {order.customer}</span>
                                        <span className="customer-phone">📞 {order.phone}</span>
                                        <span className="guest-count">👥 {order.guestCount} khách</span>
                                    </div>
                                    <div className="reservation-details">
                                        <h4>Thời gian đặt bàn</h4>
                                        <span className="booking-date">📅 Khách đặt: {order.bookingDateTime}</span>
                                        <span className="dining-date">🍽️ Ngày ăn: {order.diningDate}</span>
                                        <span className="slot-time">🕐 Khung giờ: {order.slotTime}</span>
                                    </div>
                                </div>

                                {order.totalValue > 0 && (
                                    <div className="order-value-section">
                                        <span className="order-value">💰 Tổng tiền: {formatCurrency(order.totalValue)}</span>
                                    </div>
                                )}

                                <div className="order-actions">
                                    <button
                                        className="action-btn detail"
                                        onClick={() => navigate(`/reservation-management?reservation=${order.reservationId}`)}
                                    >
                                        👁️Chi Tiết & Xử Lý
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <p className="no-data">Không có đặt bàn cần xử lý</p>
                        )}
                    </div>
                </div>

            </div>

            {/* Quick Actions */}
            <div className="waiter-quick-actions">
                <h2>Thao Tác Nhanh</h2>
                <div className="quick-actions-grid">
                    <button
                        className="quick-action-btn"
                        onClick={() => navigate('/table-layout')}
                    >
                        <FaTable />
                        <span>Sơ Đồ Bàn</span>
                    </button>
                    <button
                        className="quick-action-btn"
                        onClick={() => navigate('/reservation-management')}
                    >
                        <FaCalendarAlt />
                        <span>Lịch Đặt Bàn</span>
                    </button>
                    <button
                        className="quick-action-btn"
                        onClick={() => navigate('/menu')}
                    >
                        <FaUtensils />
                        <span>Xem Menu</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WaiterDashboard;
