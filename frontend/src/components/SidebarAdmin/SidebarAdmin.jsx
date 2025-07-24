import React, { useState, useContext, useEffect } from "react";
import { FaHome, FaSignOutAlt, FaChevronDown, FaChevronRight, FaUsers, FaCog, FaChartBar, FaBullhorn, FaList, FaTable, FaMapMarkedAlt, FaCalendarCheck, FaTrash, FaBoxes, FaUtensils } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import { AuthContext } from "../../context/AuthContext";
import "./SidebarManager.css";

const SidebarAdmin = ({ collapsed, setCollapsed }) => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const getCurrentTab = () => {
        if (location.pathname.includes("dashboard")) return "dashboard";
        if (location.pathname.includes("employees")) return "employees";
        return "dashboard";
    };
    const currentTab = getCurrentTab();

    const handleLogout = async () => {
        const result = await logout();
        if (result.success) {
            navigate("/login");
        } else {
            alert(result.message || "Đăng xuất thất bại");
        }
    };

    const handleToggle = () => setCollapsed((p) => !p);
    const handleLogoClick = () => {
        if (collapsed) {
            setCollapsed(false);
        }
    };

    const [openTableMenu, setOpenTableMenu] = useState(false);
    const [openDishMenu, setOpenDishMenu] = useState(false);

    return (
        <div className={`manager-sidebar ${collapsed ? "collapsed" : ""}`}>
            <div className="manager-sidebar-header">
                <img
                    src={logo}
                    alt="logo"
                    className={collapsed ? "sidebar-logo-center" : "sidebar-logo"}
                    onClick={handleLogoClick}
                    style={{ cursor: collapsed ? "pointer" : "default" }}
                />
                <button className="sidebar-toggle" onClick={handleToggle}>
                    <span className="toggle-bar" />
                    <span className="toggle-bar" />
                    <span className="toggle-bar" />
                </button>
            </div>
            <ul className="manager-sidebar-menu">
                <li
                    className={currentTab === "dashboard" ? "active" : ""}
                    onClick={() => navigate("/admin/dashboard")}
                >
                    <FaChartBar className="sidebar-icon" />
                    {!collapsed && <span>Thống kê</span>}
                </li>

                <li
                    className={currentTab === "employees" ? "active" : ""}
                    onClick={() => navigate("/admin/employees")}
                >
                    <FaUsers className="sidebar-icon" />
                    {!collapsed && <span>Quản lý nhân viên</span>}
                </li>
                {/* <li
                    className={currentTab === "settings" ? "active" : ""}
                    onClick={() => navigate("/manager/settings")}
                >
                    <FaCog className="sidebar-icon" />
                    {!collapsed && <span>Cài đặt</span>}
                </li> */}
                <li className="logout-item" onClick={handleLogout}>
                    <FaSignOutAlt className="sidebar-icon" />
                    {!collapsed && <span>Đăng xuất</span>}
                </li>
            </ul>
        </div>
    );
};

export default SidebarAdmin; 