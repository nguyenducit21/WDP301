import React from "react";
import { NavLink } from "react-router-dom";

const ManagerSidebar = ({ collapsed, setCollapsed }) => {
    return (
        <div
            style={{
                width: collapsed ? 80 : 250,
                height: "100vh",
                background: "#2d3142",
                color: "white",
                position: "fixed",
                left: 0,
                top: 0,
                transition: "width 0.23s",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: collapsed ? "center" : "flex-start",
            }}
        >
            <div style={{ padding: 20, fontWeight: 700, fontSize: 20, width: "100%", textAlign: collapsed ? "center" : "left" }}>
                {collapsed ? "M" : "Manager"}
            </div>
            <button
                style={{ margin: 20, alignSelf: collapsed ? "center" : "flex-end" }}
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? "☰" : "«"}
            </button>
            <nav style={{ width: "100%", marginTop: 30 }}>
                <NavLink
                    to="/manager/dashboard"
                    className={({ isActive }) =>
                        "manager-nav-item" + (isActive ? " active" : "")
                    }
                    style={{
                        display: "block",
                        padding: "12px 24px",
                        color: "white",
                        textDecoration: "none",
                        fontWeight: 500,
                        borderRadius: 8,
                        marginBottom: 8,
                        fontSize: 16,
                        background: "none",
                        transition: "background 0.2s",
                    }}
                >
                    📊 {collapsed ? "" : "Dashboard"}
                </NavLink>
                <NavLink
                    to="/manager/tables"
                    className={({ isActive }) =>
                        "manager-nav-item" + (isActive ? " active" : "")
                    }
                    style={{
                        display: "block",
                        padding: "12px 24px",
                        color: "white",
                        textDecoration: "none",
                        fontWeight: 500,
                        borderRadius: 8,
                        marginBottom: 8,
                        fontSize: 16,
                        background: "none",
                        transition: "background 0.2s",
                    }}
                >
                    🏠 {collapsed ? "" : "Quản lý bàn"}
                </NavLink>
                <NavLink
                    to="/manager/staff"
                    className={({ isActive }) =>
                        "manager-nav-item" + (isActive ? " active" : "")
                    }
                    style={{
                        display: "block",
                        padding: "12px 24px",
                        color: "white",
                        textDecoration: "none",
                        fontWeight: 500,
                        borderRadius: 8,
                        marginBottom: 8,
                        fontSize: 16,
                        background: "none",
                        transition: "background 0.2s",
                    }}
                >
                    👥 {collapsed ? "" : "Nhân viên"}
                </NavLink>
                <NavLink
                    to="/manager/orders"
                    className={({ isActive }) =>
                        "manager-nav-item" + (isActive ? " active" : "")
                    }
                    style={{
                        display: "block",
                        padding: "12px 24px",
                        color: "white",
                        textDecoration: "none",
                        fontWeight: 500,
                        borderRadius: 8,
                        marginBottom: 8,
                        fontSize: 16,
                        background: "none",
                        transition: "background 0.2s",
                    }}
                >
                    🧾 {collapsed ? "" : "Đơn hàng"}
                </NavLink>
                {/* Thêm các menu khác nếu cần */}
            </nav>
        </div>
    );
};

export default ManagerSidebar; 