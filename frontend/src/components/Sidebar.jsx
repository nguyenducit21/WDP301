import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const SIDEBAR_ITEMS = [
    { name: "Thống kê", path: "/dashboard" },
    { name: "Hóa đơn", path: "/dashboard/bills" },
    { name: "Đặt bàn", path: "/dashboard/tables" },
    { name: "Mặt hàng", path: "/dashboard/items" },
    { name: "Thực đơn", path: "/dashboard/menu" },
    { name: "Combo", path: "/dashboard/combos" },
    { name: "Nhân viên", path: "/dashboard/staff" },
    { name: "Khách hàng", path: "/dashboard/customers" },
    { name: "Hệ thống", path: "/dashboard/system" },
    { name: "Thiết lập nhà hàng", path: "/dashboard/settings" }
];

export default function Sidebar() {
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const currentPath = location.pathname;

    // Filter sidebar items based on user role
    const filteredItems = SIDEBAR_ITEMS.filter(item => {
        // If user is admin, show all items
        if (user?.role === 'admin') return true;

        // If user is waiter, only show certain items
        if (user?.role === 'waiter') {
            return ['Thống kê', 'Hóa đơn', 'Đặt bàn', 'Thực đơn'].includes(item.name);
        }

        // For manager, show most items except system settings
        if (user?.role === 'manager') {
            return item.name !== 'Hệ thống';
        }

        return true; // Default fallback
    });

    return (
        <div style={{
            width: 240, background: "#fff", boxShadow: "1px 0 8px #f0f4fb", minHeight: "100vh", paddingTop: 36
        }}>
            <div style={{ fontWeight: 700, fontSize: 22, paddingLeft: 32, color: "#2073c8", marginBottom: 24 }}>
                <span style={{ marginRight: 8 }}>🧑‍💻</span> Administration
            </div>
            <ul style={{ listStyle: "none", padding: 0 }}>
                {filteredItems.map(item => (
                    <li key={item.name}>
                        <Link
                            to={item.path}
                            style={{
                                display: "block",
                                padding: "12px 32px",
                                color: currentPath === item.path ? "#1890ff" : "#234",
                                textDecoration: "none",
                                fontWeight: 500,
                                borderRadius: 8,
                                marginBottom: 4,
                                transition: "background 0.2s",
                                background: currentPath === item.path ? "#f4f9ff" : "transparent"
                            }}
                            onMouseOver={e => {
                                if (currentPath !== item.path) {
                                    e.target.style.background = "#f4f9ff";
                                }
                            }}
                            onMouseOut={e => {
                                if (currentPath !== item.path) {
                                    e.target.style.background = "transparent";
                                }
                            }}
                        >
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
