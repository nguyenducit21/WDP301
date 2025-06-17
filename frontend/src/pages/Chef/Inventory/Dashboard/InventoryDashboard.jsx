// pages/Chef/Dashboard/InventoryDashboard.jsx
import React, { useState, useEffect } from 'react';
import { FaBoxes, FaExclamationTriangle, FaChartLine } from 'react-icons/fa';

const InventoryDashboard = () => {
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStockItems: 0,
        totalValue: 0,
        topUsedIngredients: []
    });

    return (
        <div className="inventory-dashboard">
            <div className="stats-grid">
                <div className="stat-card">
                    <FaBoxes className="stat-icon" />
                    <div className="stat-info">
                        <h3>{stats.totalItems}</h3>
                        <p>Tổng nguyên liệu</p>
                    </div>
                </div>
                
                <div className="stat-card warning">
                    <FaExclamationTriangle className="stat-icon" />
                    <div className="stat-info">
                        <h3>{stats.lowStockItems}</h3>
                        <p>Sắp hết hàng</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <FaChartLine className="stat-icon" />
                    <div className="stat-info">
                        <h3>{stats.totalValue.toLocaleString()} VND</h3>
                        <p>Giá trị tồn kho</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
