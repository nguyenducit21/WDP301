import React from 'react';
import { Routes, Route, NavLink, Outlet } from 'react-router-dom';
import './WaiterLayout.css';

const WaiterLayout = () => {
    return (
        <div className="waiter-layout">
            <div className="waiter-sidebar">
                <div className="waiter-header">
                    <h2>👨‍💼 Waiter Dashboard</h2>
                </div>

                <nav className="waiter-nav">
                    <NavLink to="/waiter/dashboard" className="nav-item">
                        📊 Dashboard
                    </NavLink>
                    <NavLink to="/waiter/reservations" className="nav-item">
                        📅 Đặt bàn
                    </NavLink>
                    <NavLink to="/waiter/orders" className="nav-item">
                        🍽️ Đơn hàng
                    </NavLink>
                    <NavLink to="/waiter/tables" className="nav-item">
                        🪑 Quản lý bàn
                    </NavLink>
                    <NavLink to="/waiter/checkout" className="nav-item">
                        💳 Thanh toán
                    </NavLink>
                </nav>
            </div>

            <div className="waiter-content">
                <Outlet />
            </div>
        </div>
    );
};

export default WaiterLayout;