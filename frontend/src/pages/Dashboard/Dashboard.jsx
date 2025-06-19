import React from 'react';
import Sidebar from '../../components/Sidebar';
import './Dashboard.css';

const Dashboard = () => {
    return (
        <div className="dashboard-container">
            <Sidebar />
            <div className="dashboard-content">
                <h1>Dashboard</h1>
                <p>Welcome to the administration dashboard.</p>

                <div className="dashboard-stats">
                    <div className="stat-card">
                        <h3>Orders</h3>
                        <p className="stat-number">24</p>
                    </div>
                    <div className="stat-card">
                        <h3>Reservations</h3>
                        <p className="stat-number">12</p>
                    </div>
                    <div className="stat-card">
                        <h3>Menu Items</h3>
                        <p className="stat-number">48</p>
                    </div>
                    <div className="stat-card">
                        <h3>Staff</h3>
                        <p className="stat-number">8</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard; 