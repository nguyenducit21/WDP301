import React, { useState, useContext, useEffect } from "react";
import { FaHome, FaSignOutAlt, FaChevronDown, FaChevronRight, FaUsers, FaCog, FaChartBar, FaBullhorn, FaList, FaTable, FaMapMarkedAlt, FaCalendarCheck, FaTrash, FaBoxes, FaUtensils } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import { AuthContext } from "../../context/AuthContext";
import "./SidebarManager.css";

const SidebarManager = ({ collapsed, setCollapsed }) => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const getCurrentTab = () => {
        if (location.pathname.includes("dashboard")) return "dashboard";
        if (location.pathname.includes("table-layout")) return "table-layout";
        if (location.pathname.includes("reservation-management")) return "reservation-management";
        if (location.pathname.includes("areas")) return "areas";
        if (location.pathname.includes("products")) return "products";
        if (location.pathname.includes("promotion-management")) return "promotion-management";
        if (location.pathname.includes("employees")) return "employees";
        if (location.pathname.includes("settings")) return "settings";
        if (location.pathname.includes("menu/dashboard")) return "menu-dashboard";
        if (location.pathname.includes("menu/management")) return "menu-management";
        if (location.pathname.includes("menu/category")) return "menu-category";
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
                    onClick={() => navigate("/manager/dashboard")}
                >
                    <FaChartBar className="sidebar-icon" />
                    {!collapsed && <span>Thống kê</span>}
                </li>
                <li
                    className={currentTab === "table-layout" || currentTab === "reservation-management" || currentTab === "area-management" ? "active parent-active" : "parent"}
                    onClick={() => setOpenTableMenu((prev) => !prev)}
                >
                    <FaTable className="sidebar-icon" />
                    {!collapsed && <span>Quản lý bàn</span>}
                    {!collapsed && (
                        <span className="submenu-arrow">
                            {openTableMenu ? <FaChevronDown /> : <FaChevronRight />}
                        </span>
                    )}
                </li>
                {openTableMenu && !collapsed && (
                    <ul className="manager-sidebar-submenu">
                        <li
                            className={currentTab === "table-layout" ? "active" : ""}
                            onClick={() => navigate("/manager/table-layout")}
                        >
                            <FaTable className="sidebar-icon" />
                            <span>Quản lý bàn</span>
                        </li>
                        <li
                            className={currentTab === "reservation-management" ? "active" : ""}
                            onClick={() => navigate("/manager/reservation-management")}
                        >
                            <FaCalendarCheck className="sidebar-icon" />
                            <span>Quản lý đặt bàn</span>
                        </li>
                        <li
                            className={currentTab === "area-management" ? "active" : ""}
                            onClick={() => navigate("/manager/areas")}
                        >
                            <FaMapMarkedAlt className="sidebar-icon" />
                            <span>Quản lý khu vực</span>
                        </li>
                    </ul>
                )}


                <li
                    className={currentTab === "menu-dashboard" || currentTab === "menu-management" || currentTab === "menu-category" ? "active parent-active" : "parent"}
                    onClick={() => setOpenTableMenu((prev) => !prev)}
                >
                    <FaUtensils className="sidebar-icon" />
                    {!collapsed && <span>Quản lý món ăn</span>}
                    {!collapsed && (
                        <span className="submenu-arrow">
                            {openTableMenu ? <FaChevronDown /> : <FaChevronRight />}
                        </span>
                    )}
                </li>
                {openTableMenu && !collapsed && (
                    <ul className="manager-sidebar-submenu">
                        <li
                            className={currentTab === "menu-dashboard" ? "active" : ""}
                            onClick={() => navigate("/manager/dish/dashboard")}
                        >
                            <FaTable className="sidebar-icon" />
                            <span>Thống kê</span>
                        </li>
                        <li
                            className={currentTab === "menu-management" ? "active" : ""}
                            onClick={() => navigate("/manager/products")}
                        >
                            <FaUtensils className="sidebar-icon" />
                            <span>Quản lý món ăn</span>
                        </li>
                        <li
                            className={currentTab === "menu-category" ? "active" : ""}
                            onClick={() => navigate("/manager/menu/category")}
                        >
                            <FaMapMarkedAlt className="sidebar-icon" />
                            <span>Quản lý danh mục</span>
                        </li>
                        <li
                            className={currentTab === "menu-category" ? "active" : ""}
                            onClick={() => navigate("/manager/deleted-menu-items")}
                        >
                            <FaTrash className="sidebar-icon" />
                            <span>Món ăn tạm ẩn</span>
                        </li>
                    </ul>
                )}

                <li
                    className={currentTab === "promotion-management" ? "active" : ""}
                    onClick={() => navigate("/manager/promotion-management")}
                >
                    <FaBullhorn className="sidebar-icon" />
                    {!collapsed && <span>Khuyến mãi</span>}
                </li>
                <li
                    className={currentTab === "employees" ? "active" : ""}
                    onClick={() => navigate("/manager/employees")}
                >
                    <FaUsers className="sidebar-icon" />
                    {!collapsed && <span>Quản lý nhân viên</span>}
                </li>
                <li
                    className={currentTab === "settings" ? "active" : ""}
                    onClick={() => navigate("/manager/settings")}
                >
                    <FaCog className="sidebar-icon" />
                    {!collapsed && <span>Cài đặt</span>}
                </li>
                <li className="logout-item" onClick={handleLogout}>
                    <FaSignOutAlt className="sidebar-icon" />
                    {!collapsed && <span>Đăng xuất</span>}
                </li>
            </ul>
        </div>
    );
};

export default SidebarManager; 