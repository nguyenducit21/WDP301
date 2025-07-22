
import React, { useState, useContext, useEffect } from "react";
import { FaHome, FaUtensils, FaSignOutAlt, FaChevronDown, FaList, FaUsers, FaUserTie, FaClipboardList, FaCog, FaChartBar, FaBoxes, FaReceipt, FaFileInvoice, FaTrash, FaShoppingCart, FaCreditCard } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import { AuthContext } from "../../context/AuthContext";
import "./SidebarWaiter.css";

const SidebarWaiter = ({ collapsed, setCollapsed }) => {
    const [statsMenu, setStatsMenu] = useState(false);
    const [reservationMenu, setReservationMenu] = useState(false);
    const [menuItemsMenu, setMenuItemsMenu] = useState(false);
    const [employeeMenu, setEmployeeMenu] = useState(false);
    const [settingsMenu, setSettingsMenu] = useState(false);
    const [inventoryMenu, setInventoryMenu] = useState(false);
    const { logout } = useContext(AuthContext);

    const navigate = useNavigate();
    const location = useLocation();


    const handleLogout = async () => {
        const result = await logout();
        if (result.success) {
            navigate("/login");
        } else {
            alert(result.message || "Đăng xuất thất bại");
        }
    };


    // Xác định tab hiện tại dựa trên URL
    const getCurrentTab = () => {
        if (location.pathname.includes("dashboard")) return "dashboard";
        if (location.pathname.includes("schedule")) return "schedule";
        if (location.pathname.includes("table-layout")) return "tables";
        if (location.pathname.includes("reservation-management")) return "reservations";
        if (location.pathname.includes("areas")) return "areas";
        if (location.pathname.includes("products")) return "products";
        if (location.pathname.includes("inventory-list")) return "inventory-list";
        if (location.pathname.includes("recipes")) return "recipes";
        if (location.pathname.includes("import-receipts")) return "import-receipts";
        if (location.pathname.includes("employees")) return "employees";
        if (location.pathname.includes("permissions")) return "permissions";
        if (location.pathname.includes("orders")) return "orders";
        if (location.pathname.includes("payments")) return "payments";
        return "dashboard";
    };

    const currentTab = getCurrentTab();

    // Tự động mở submenu khi tab active nằm trong submenu
    useEffect(() => {
        // Kiểm tra và mở reservation menu nếu tab active là tables, reservations, hoặc areas
        if (['tables', 'reservations', 'areas'].includes(currentTab)) {
            setReservationMenu(true);
        }

        // Kiểm tra và mở menu items menu nếu tab active là products
        if (['products'].includes(currentTab)) {
            setMenuItemsMenu(true);
        }

        // Kiểm tra và mở inventory menu nếu tab active là inventory-list, recipes, hoặc import-receipts
        if (['inventory-list', 'recipes', 'import-receipts'].includes(currentTab)) {
            setInventoryMenu(true);
        }

        // Kiểm tra và mở employee menu nếu tab active là employees hoặc permissions
        if (['employees', 'permissions'].includes(currentTab)) {
            setEmployeeMenu(true);
        }
        
    }, [currentTab]);

    const handleToggle = () => setCollapsed((p) => !p);

    const handleLogoClick = () => {
        if (collapsed) {
            setCollapsed(false);
        }
    };

    return (
        <div className={`chef-sidebar ${collapsed ? "collapsed" : ""}`}>
            {/* Logo + Toggle button */}
            <div className="chef-sidebar-header">
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

            <ul className="chef-sidebar-menu">
                {/* Dashboard */}
                <li
                    className={currentTab === "dashboard" ? "active" : ""}
                    onClick={() => navigate("/waiter")}
                >
                    <FaChartBar className="sidebar-icon" />
                    {!collapsed && <span>Thống kê</span>}
                </li>

                {/* Lịch làm việc */}
                <li
                    className={currentTab === "schedule" ? "active" : ""}
                    onClick={() => navigate("/waiter/schedule")}
                >
                    <FaChartBar className="sidebar-icon" />
                    {!collapsed && <span>Lịch làm việc</span>}
                </li>

                {/* Đặt bàn */}
                <li
                    className={`menu-parent ${collapsed ? "collapsed" : ""}`}
                    onClick={() => setReservationMenu((v) => !v)}
                >
                    <FaClipboardList className="sidebar-icon" />
                    {!collapsed && (
                        <>
                            <span>Đặt bàn</span>
                            <FaChevronDown className={`chevron ${reservationMenu ? "open" : ""}`} />
                        </>
                    )}
                </li>

                {/* Submenu đặt bàn */}
                {!collapsed && (
                    <ul className={`chef-sidebar-submenu ${reservationMenu ? "open" : ""}`}>
                        <li
                            className={currentTab === "tables" ? "active" : ""}
                            onClick={() => navigate("/waiter/table-layout")}
                        >
                            <FaList className="sidebar-icon" />
                            <span>Quản lý bàn</span>
                        </li>
                        <li
                            className={currentTab === "reservations" ? "active" : ""}
                            onClick={() => navigate("/waiter/reservation-management")}
                        >
                            <FaList className="sidebar-icon" />
                            <span>Quản lý đặt bàn</span>
                        </li>
                        <li
                            className={currentTab === "areas" ? "active" : ""}
                            onClick={() => navigate("/waiter/areas")}
                        >
                            <FaList className="sidebar-icon" />
                            <span>Quản lý khu vực</span>
                        </li>
                    </ul>
                )}

                {/* Quản lý món ăn */}
                <li
                    className={`menu-parent ${collapsed ? "collapsed" : ""}`}
                    onClick={() => setMenuItemsMenu((v) => !v)}
                >
                    <FaUtensils className="sidebar-icon" />
                    {!collapsed && (
                        <>
                            <span>Quản lý món ăn</span>
                            <FaChevronDown className={`chevron ${menuItemsMenu ? "open" : ""}`} />
                        </>
                    )}
                </li>

                {/* Submenu món ăn */}
                {!collapsed && (
                    <ul className={`chef-sidebar-submenu ${menuItemsMenu ? "open" : ""}`}>

                        <li
                            className={currentTab === "products" ? "active" : ""}
                            onClick={() => navigate("/waiter/products")}
                        >
                            <FaUtensils className="sidebar-icon" />
                            <span>Sản phẩm</span>
                        </li>

                    </ul>
                )}


                {/* Đơn hàng */}
                <li
                    className={currentTab === "orders" ? "active" : ""}
                    onClick={() => navigate("/waiter/orders")}
                >
                    <FaShoppingCart className="sidebar-icon" />
                    {!collapsed && <span>Đơn hàng</span>}
                </li>

                {/* Thanh toán */}
                <li
                    className={currentTab === "payments" ? "active" : ""}
                    onClick={() => navigate("/waiter/payments")}
                >
                    <FaCreditCard className="sidebar-icon" />
                    {!collapsed && <span>Thanh toán</span>}
                </li>
                {/* Nút đăng xuất */}
                <li className="logout-item" onClick={handleLogout}>
                    <FaSignOutAlt className="sidebar-icon" />
                    {!collapsed && <span>Đăng xuất</span>}
                </li>
            </ul>
        </div>
    );
};

export default SidebarWaiter;
