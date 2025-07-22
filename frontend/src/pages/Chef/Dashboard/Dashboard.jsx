import React, { useState, useContext } from 'react';
import Sidebar from '../../components/Sidebar';
import { AuthContext } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import WaiterDashboard from './WaiterDashboard';
import KitchenStaffDashboard from './KitchenStaffDashboard';
import './Dashboard.css';

const Dashboard = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { user } = useContext(AuthContext);

    // Get user role from context
    const getUserRole = () => {
        if (!user || !user.user) return null;
        return user.user.role;
    };

    // Render appropriate dashboard based on user role
    const renderDashboardContent = () => {
        const userRole = getUserRole();

        switch (userRole) {
            case 'admin':
                return <AdminDashboard />;
            case 'manager':
                return <ManagerDashboard />;
            case 'waiter':
                return <WaiterDashboard />;
            case 'kitchen_staff':
                return <KitchenStaffDashboard />;
            default:
                return (
                    <div className="default-dashboard">
                        <h1>Dashboard</h1>
                        <p>Chào mừng bạn đến với hệ thống quản lý nhà hàng.</p>
                        <div className="dashboard-stats">
                            <div className="stat-card">
                                <h3>Đơn Hàng</h3>
                                <p className="stat-number">24</p>
                            </div>
                            <div className="stat-card">
                                <h3>Đặt Bàn</h3>
                                <p className="stat-number">12</p>
                            </div>
                            <div className="stat-card">
                                <h3>Món Ăn</h3>
                                <p className="stat-number">48</p>
                            </div>
                            <div className="stat-card">
                                <h3>Nhân Viên</h3>
                                <p className="stat-number">8</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <div className="dashboard-content" style={{
                marginLeft: collapsed ? '80px' : '250px',
                transition: 'margin-left 0.2s'
            }}>
                {renderDashboardContent()}
            </div>
        </div>
    );
};

export default Dashboard;