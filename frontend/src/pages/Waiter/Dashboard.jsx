import React from 'react';
import './Dashboard.css';

const WaiterDashboard = () => {
    return (
        <div className="waiter-dashboard">
            <div className="dashboard-header">
                <h1>👨‍💼 Dashboard Waiter</h1>
                <p>Chào mừng bạn đến với hệ thống quản lý nhà hàng</p>
            </div>

            <div className="dashboard-stats">
                <div className="stat-card">
                    <h3>📊 Tổng quan</h3>
                    <p>Đây là trang dashboard cho waiter</p>
                </div>
            </div>
        </div>
    );
};

export default WaiterDashboard;