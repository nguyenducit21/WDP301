import React, { useState, useEffect } from 'react';
import {
    FaChartLine,
    FaClipboardList,
    FaMoneyBillWave,
    FaUsers,
    FaCheckCircle,
    FaExclamationTriangle,
    FaCalendarDay,
    FaSync,
    FaFilter,
    FaArrowUp,
    FaArrowDown,
    FaCalendarWeek,
    FaCalendarAlt
} from 'react-icons/fa';
import axios from '../../utils/axios.customize';
import './ManagerDashboard.css';
import { Link } from 'react-router-dom';


const ManagerDashboard = () => {
    // States cho dashboard stats
    const [stats, setStats] = useState({
        todayRevenue: 0,
        todayOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        activeStaff: 0,
        customerSatisfaction: 0,
        tableOccupancy: 0
    });

    // States cho dữ liệu
    const [recentReservations, setRecentReservations] = useState([]);
    const [staffStatus, setStaffStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter cho dashboard chính (doanh thu, đơn hàng)
    const [dashboardFilter, setDashboardFilter] = useState({
        period: 'today', // today, week, month, custom
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    // Filter riêng cho nhân viên
    const [staffFilter, setStaffFilter] = useState({
        period: 'week', // today, week, month, custom
        startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchAllData();
    }, [dashboardFilter, staffFilter]);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchDashboardStats(),
                fetchRecentReservations(),
                fetchStaffStatus()
            ]);
        } catch (err) {
            setError('Lỗi khi tải dữ liệu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboardStats = async () => {
        try {
            const params = {
                period: dashboardFilter.period,
                startDate: dashboardFilter.startDate,
                endDate: dashboardFilter.endDate
            };

            const response = await axios.get('/dashboard/manager', { params });

            if (response.data.success) {
                setStats(response.data.data);
            } else {
                setError('Lỗi từ server: ' + response.data.message);
            }
        } catch (error) {
            setError('Lỗi kết nối: ' + error.message);
            console.error('Fetch stats error:', error);
        }
    };

    const fetchRecentReservations = async () => {
        try {
            const response = await axios.get('/dashboard/recent-reservations', {
                params: { limit: 5 }
            });

            if (response.data.success) {
                setRecentReservations(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching recent reservations:', error);
            setRecentReservations([]);
        }
    };

    const fetchStaffStatus = async () => {
        try {
            const params = {
                limit: 10,
                period: staffFilter.period,
                startDate: staffFilter.startDate,
                endDate: staffFilter.endDate
                // Bỏ sortBy, sortOrder
            };

            const response = await axios.get('/dashboard/staff-status', { params });

            if (response.data.success) {
                setStaffStatus(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching staff status:', error);
            setStaffStatus([]);
        }
    };


    // Utility functions
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount || 0);
    };

    const getOrderStatusColor = (status) => {
        const colors = {
            pending: 'warning',
            preparing: 'info',
            completed: 'success',
            served: 'primary',
            confirmed: 'info',
            cancelled: 'danger'
        };
        return colors[status] || 'secondary';
    };

    const getOrderStatusText = (status) => {
        const texts = {
            pending: 'Chờ xử lý',
            preparing: 'Đang chuẩn bị',
            completed: 'Hoàn thành',
            served: 'Đã phục vụ',
            confirmed: 'Đã xác nhận',
            cancelled: 'Đã hủy'
        };
        return texts[status] || status;
    };

    const getPerformanceColor = (performance) => {
        const colors = {
            'Xuất sắc': '#28a745',
            'Chăm chỉ': '#17a2b8',
            'Trung bình': '#ffc107',
            'Cần cải thiện': '#dc3545'
        };
        return colors[performance] || '#6c757d';
    };

    const getPerformanceIcon = (current, previous) => {
        if (current > previous) {
            return <FaArrowUp style={{ color: '#28a745', fontSize: '12px', marginLeft: '4px' }} />;
        } else if (current < previous) {
            return <FaArrowDown style={{ color: '#dc3545', fontSize: '12px', marginLeft: '4px' }} />;
        }
        return null;
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

    // Event handlers
    const handleRefresh = () => {
        fetchAllData();
    };

    const handleDashboardPeriodChange = (period) => {
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

        setDashboardFilter(prev => ({
            ...prev,
            period,
            ...(period !== 'custom' && {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            })
        }));
    };

    const handleStaffPeriodChange = (period) => {
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

        setStaffFilter(prev => ({
            ...prev,
            period,
            ...(period !== 'custom' && {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            })
        }));
    };

    const handleDashboardFilterChange = (key, value) => {
        setDashboardFilter(prev => ({ ...prev, [key]: value }));
    };

    const handleStaffFilterChange = (key, value) => {
        setStaffFilter(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <div className="manager-dashboard">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="manager-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Dashboard Quản Lý</h1>
                    <p>Giám sát hoạt động kinh doanh và nhân viên</p>
                </div>

                <div className="dashboard-controls">
                    <button onClick={handleRefresh} disabled={loading} className="refresh-btn">
                        <FaSync className={loading ? 'fa-spin' : ''} />
                        {loading ? 'Đang tải...' : 'Làm mới'}
                    </button>
                    {error && <div className="error-message">{error}</div>}
                </div>
            </div>

            {/* Dashboard Stats với Filter */}
            <div className="stats-section">
                <div className="section-header">
                    <h2>Thống kê kinh doanh</h2>
                    <div className="dashboard-filters">
                        <div className="quick-filters">
                            {['today', 'week', 'month', 'custom'].map(period => (
                                <button
                                    key={period}
                                    className={`filter-btn ${dashboardFilter.period === period ? 'active' : ''}`}
                                    onClick={() => handleDashboardPeriodChange(period)}
                                >
                                    {period === 'today' && <FaCalendarDay />}
                                    {period === 'week' && <FaCalendarWeek />}
                                    {period === 'month' && <FaCalendarAlt />}
                                    {period === 'custom' && <FaFilter />}
                                    {getPeriodLabel(period)}
                                </button>
                            ))}
                        </div>

                        {dashboardFilter.period === 'custom' && (
                            <div className="custom-date-range">
                                <input
                                    type="date"
                                    value={dashboardFilter.startDate}
                                    onChange={(e) => handleDashboardFilterChange('startDate', e.target.value)}
                                />
                                <span>đến</span>
                                <input
                                    type="date"
                                    value={dashboardFilter.endDate}
                                    onChange={(e) => handleDashboardFilterChange('endDate', e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="manager-stats-grid">
                    <div className="manager-stat-card revenue">
                        <div className="stat-icon"><FaMoneyBillWave /></div>
                        <div className="stat-content">
                            <h3>Doanh thu {getPeriodLabel(dashboardFilter.period).toLowerCase()}</h3>
                            <p className="stat-number">{formatCurrency(stats.todayRevenue)}</p>
                            <span className="stat-target">
                                {dashboardFilter.period === 'today' && 'Mục tiêu: 3.000.000đ'}
                                {dashboardFilter.period === 'week' && 'Mục tiêu: 20.000.000đ'}
                                {dashboardFilter.period === 'month' && 'Mục tiêu: 90.000.000đ'}
                            </span>
                        </div>
                    </div>

                    <div className="manager-stat-card orders">
                        <div className="stat-icon"><FaClipboardList /></div>
                        <div className="stat-content">
                            <h3>Đơn hàng {getPeriodLabel(dashboardFilter.period).toLowerCase()}</h3>
                            <p className="stat-number">{stats.todayOrders}</p>
                            <span className="stat-detail">
                                {stats.completedOrders} hoàn thành, {stats.pendingOrders} đang chờ
                            </span>
                        </div>
                    </div>

                    <div className="manager-stat-card staff">
                        <div className="stat-icon"><FaUsers /></div>
                        <div className="stat-content">
                            <h3>Nhân viên đang làm</h3>
                            <p className="stat-number">{stats.activeStaff}</p>
                            <span className="stat-detail">Tất cả đang hoạt động</span>
                        </div>
                    </div>

                    <div className="manager-stat-card performance">
                        <div className="stat-icon"><FaCheckCircle /></div>
                        <div className="stat-content">
                            <h3>Hiệu suất tổng quan</h3>
                            <p className="stat-number">{stats.tableOccupancy}%</p>
                            <span className="stat-detail">Tỷ lệ lấp đầy bàn</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Indicators */}
            <div className="performance-indicators">
                <div className="indicator-card">
                    <FaCheckCircle className="indicator-icon success" />
                    <div>
                        <h4>Độ hài lòng KH</h4>
                        <p>{stats.customerSatisfaction}/5.0 ⭐</p>
                    </div>
                </div>
                <div className="indicator-card">
                    <FaCalendarDay className="indicator-icon info" />
                    <div>
                        <h4>Tỷ lệ lấp đầy bàn</h4>
                        <p>{stats.tableOccupancy}%</p>
                    </div>
                </div>
                <div className="indicator-card">
                    <FaExclamationTriangle className="indicator-icon warning" />
                    <div>
                        <h4>Đơn hàng chờ</h4>
                        <p>{stats.pendingOrders} đơn</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="manager-content-grid">
                <div className="recent-orders">
                    <h2>Đặt bàn gần đây</h2>
                    <div className="orders-list">
                        {recentReservations.length > 0 ? (
                            recentReservations.map((reservation) => (
                                <div key={reservation.id} className="order-item">
                                    <div className="order-info">
                                        <span className="order-id">{reservation.id}</span>
                                        <span className="order-table">{reservation.table}</span>
                                        <span className="order-customer">{reservation.customer}</span>
                                        {reservation.guestCount && (
                                            <span className="guest-count">{reservation.guestCount} khách</span>
                                        )}
                                    </div>
                                    <div className="order-details">
                                        <span className={`order-status ${getOrderStatusColor(reservation.status)}`}>
                                            {getOrderStatusText(reservation.status)}
                                        </span>
                                        {reservation.total > 0 && (
                                            <span className="order-total">{formatCurrency(reservation.total)}</span>
                                        )}
                                        <span className="payment-status">
                                            {reservation.paymentStatus === 'paid' ? '✅ Đã thanh toán' :
                                                reservation.paymentStatus === 'pending' ? '⏳ Chờ thanh toán' : '❌ Chưa thanh toán'}
                                        </span>
                                    </div>
                                    <div className="order-time-info">
                                        <span className="reservation-time">{reservation.reservationTime}</span>
                                        <span className="created-by">{reservation.createdBy}</span>
                                        {reservation.phone && (
                                            <span className="phone-number">📞 {reservation.phone}</span>
                                        )}
                                    </div>

                                </div>
                            ))
                        ) : (
                            <p className="no-data">Không có đặt bàn gần đây</p>
                        )}
                    </div>
                </div>



                <div className="staff-status">
                    <div className="staff-header-section">
                        <h2>Trạng thái nhân viên</h2>

                        {/* VẪN GIỮ FILTER */}
                        <div className="staff-filters">
                            <div className="quick-filters">
                                {['today', 'week', 'month', 'custom'].map(period => (
                                    <button
                                        key={period}
                                        className={`filter-btn small ${staffFilter.period === period ? 'active' : ''}`}
                                        onClick={() => handleStaffPeriodChange(period)}
                                    >
                                        {getPeriodLabel(period)}
                                    </button>
                                ))}
                            </div>

                            {staffFilter.period === 'custom' && (
                                <div className="custom-date-range">
                                    <input
                                        type="date"
                                        value={staffFilter.startDate}
                                        onChange={(e) => handleStaffFilterChange('startDate', e.target.value)}
                                    />
                                    <span>đến</span>
                                    <input
                                        type="date"
                                        value={staffFilter.endDate}
                                        onChange={(e) => handleStaffFilterChange('endDate', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="staff-list">
                        {staffStatus.length > 0 ? (
                            <>
                                {/* HEADER 4 CỘT */}
                                <div className="staff-header">
                                    <span className="staff-name-header">Tên nhân viên</span>
                                    <span className="staff-status-header">Trạng thái</span>
                                    <span className="staff-tables-header">Đang phục vụ</span>
                                    <span className="staff-orders-header">Đã phục vụ</span>
                                </div>

                                {/* DANH SÁCH */}
                                {staffStatus.map((staff) => (
                                    <div key={staff.id} className="staff-item">
                                        <div className="staff-info">
                                            <span className="staff-name">{staff.full_name}</span>
                                            <span className="staff-role">{staff.role}</span>
                                        </div>

                                        <div className="staff-details">
                                            <span className={`staff-status-value ${staff.status}`}>
                                                {staff.status === 'active' ? 'Đang làm việc' : 'Nghỉ'}
                                            </span>

                                            {/* ĐANG PHỤC VỤ */}
                                            <span className="staff-tables">
                                                {staff.tablesServing || '0'} bàn
                                            </span>

                                            {/* ĐÃ PHỤC VỤ (tổng reservation hôm nay) */}
                                            <span className="staff-orders">
                                                {staff.ordersToday || '0'} đơn
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p className="no-data">Không có dữ liệu nhân viên</p>
                        )}
                    </div>
                </div>


            </div>

            <div className="manager-quick-actions">
                <h2>Thao tác nhanh</h2>
                <div className="quick-actions-grid-simple">
                    <Link to="/reservation-management" className="quick-action-btn large">
                        <FaCalendarAlt />
                        <span>Quản lý đặt bàn</span>
                        <small>Xem, sửa, hủy và theo dõi tình trạng bàn</small>
                    </Link>
                    <Link to="/dashboard/employees" className="quick-action-btn large">
                        <FaUsers />
                        <span>Quản lý nhân viên</span>
                        <small>Phân công ca, theo dõi phục vụ</small>
                    </Link>
                </div>
            </div>


        </div>
    );
};

export default ManagerDashboard;
