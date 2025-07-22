import React, { useState, useEffect } from 'react';
import {
    FaUsers,
    FaChartLine,
    FaMoneyBillWave,
    FaClipboardList,
    FaUserTie,
    FaCog,
    FaStore,
    FaCalendarAlt
} from 'react-icons/fa';
import axios from '../../utils/axios.customize';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalRevenue: 0,
        totalOrders: 0,
        totalEmployees: 0,
        monthlyRevenue: 0,
        todayOrders: 0,
        activeEmployees: 0,
        totalTables: 0
    });

    const [recentActivities, setRecentActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminStats();
        fetchRecentActivities();
    }, []);

    const fetchAdminStats = async () => {
        try {
            const response = await axios.get('/dashboard/admin');
            if (response.data.success) {
                setStats(response.data.data);
            } else {
                console.error('Failed to fetch admin stats:', response.data.message);
                // Fallback to default data
                setStats({
                    totalUsers: 0,
                    totalRevenue: 0,
                    totalOrders: 0,
                    totalEmployees: 0,
                    monthlyRevenue: 0,
                    todayOrders: 0,
                    activeEmployees: 0,
                    totalTables: 0
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            // Fallback to default data on error
            setStats({
                totalUsers: 0,
                totalRevenue: 0,
                totalOrders: 0,
                totalEmployees: 0,
                monthlyRevenue: 0,
                todayOrders: 0,
                activeEmployees: 0,
                totalTables: 0
            });
            setLoading(false);
        }
    };

    const fetchRecentActivities = async () => {
        try {
            // Simulate API call - replace with actual API
            setTimeout(() => {
                setRecentActivities([
                    { id: 1, type: 'user', message: 'Nhân viên mới được thêm: Nguyễn Văn A', time: '10 phút trước' },
                    { id: 2, type: 'order', message: 'Đơn hàng #1234 đã hoàn thành', time: '15 phút trước' },
                    { id: 3, type: 'revenue', message: 'Doanh thu hôm nay đạt 2.5 triệu', time: '30 phút trước' },
                    { id: 4, type: 'system', message: 'Cập nhật hệ thống thành công', time: '1 giờ trước' },
                    { id: 5, type: 'employee', message: 'Nhân viên Trần Thị B đã check-in', time: '2 giờ trước' }
                ]);
            }, 800);
        } catch (error) {
            console.error('Error fetching recent activities:', error);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>Dashboard Quản Trị</h1>
                <p>Tổng quan hệ thống và hoạt động kinh doanh</p>
            </div>

            {/* Main Stats Grid */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card primary">
                    <div className="stat-icon">
                        <FaMoneyBillWave />
                    </div>
                    <div className="stat-content">
                        <h3>Tổng Doanh Thu</h3>
                        <p className="stat-number">{formatCurrency(stats.totalRevenue)}</p>
                        <span className="stat-change positive">+12.5% so với tháng trước</span>
                    </div>
                </div>

                <div className="admin-stat-card success">
                    <div className="stat-icon">
                        <FaClipboardList />
                    </div>
                    <div className="stat-content">
                        <h3>Tổng Đơn Hàng</h3>
                        <p className="stat-number">{stats.totalOrders.toLocaleString()}</p>
                        <span className="stat-change positive">+8.3% so với tháng trước</span>
                    </div>
                </div>

                <div className="admin-stat-card info">
                    <div className="stat-icon">
                        <FaUsers />
                    </div>
                    <div className="stat-content">
                        <h3>Tổng Khách Hàng</h3>
                        <p className="stat-number">{stats.totalUsers.toLocaleString()}</p>
                        <span className="stat-change positive">+15.2% so với tháng trước</span>
                    </div>
                </div>

                <div className="admin-stat-card warning">
                    <div className="stat-icon">
                        <FaUserTie />
                    </div>
                    <div className="stat-content">
                        <h3>Nhân Viên</h3>
                        <p className="stat-number">{stats.activeEmployees}/{stats.totalEmployees}</p>
                        <span className="stat-change neutral">Đang hoạt động</span>
                    </div>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="admin-secondary-stats">
                <div className="secondary-stat-card">
                    <FaChartLine className="secondary-icon" />
                    <div>
                        <h4>Doanh Thu Tháng Này</h4>
                        <p>{formatCurrency(stats.monthlyRevenue)}</p>
                    </div>
                </div>

                <div className="secondary-stat-card">
                    <FaCalendarAlt className="secondary-icon" />
                    <div>
                        <h4>Đơn Hàng Hôm Nay</h4>
                        <p>{stats.todayOrders} đơn</p>
                    </div>
                </div>

                <div className="secondary-stat-card">
                    <FaStore className="secondary-icon" />
                    <div>
                        <h4>Tổng Số Bàn</h4>
                        <p>{stats.totalTables} bàn</p>
                    </div>
                </div>

                <div className="secondary-stat-card">
                    <FaCog className="secondary-icon" />
                    <div>
                        <h4>Hệ Thống</h4>
                        <p>Hoạt động bình thường</p>
                    </div>
                </div>
            </div>

            {/* Recent Activities */}
            <div className="admin-activities">
                <h2>Hoạt Động Gần Đây</h2>
                <div className="activities-list">
                    {recentActivities.map(activity => (
                        <div key={activity.id} className={`activity-item ${activity.type}`}>
                            <div className="activity-content">
                                <p>{activity.message}</p>
                                <span className="activity-time">{activity.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="admin-quick-actions">
                <h2>Thao Tác Nhanh</h2>
                <div className="quick-actions-grid">
                    <button className="quick-action-btn">
                        <FaUsers />
                        <span>Quản Lý Nhân Viên</span>
                    </button>
                    <button className="quick-action-btn">
                        <FaChartLine />
                        <span>Báo Cáo Doanh Thu</span>
                    </button>
                    <button className="quick-action-btn">
                        <FaCog />
                        <span>Cài Đặt Hệ Thống</span>
                    </button>
                    <button className="quick-action-btn">
                        <FaStore />
                        <span>Quản Lý Cửa Hàng</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
