// import React, { useContext } from "react";
// import { AuthContext } from "../context/AuthContext";
// import Notification from "./Notification/Notification";
import React, { useState } from "react";
import { FaHome, FaUtensils, FaChevronDown, FaList, FaUsers, FaUserTie, FaClipboardList, FaCog, FaChartBar, FaBoxes, FaReceipt, FaFileInvoice, FaTrash, FaShoppingCart, FaCreditCard } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

const Sidebar = ({ collapsed, setCollapsed }) => {
    const [statsMenu, setStatsMenu] = useState(false);
    const [reservationMenu, setReservationMenu] = useState(false);
    const [menuItemsMenu, setMenuItemsMenu] = useState(false);
    const [employeeMenu, setEmployeeMenu] = useState(false);
    const [settingsMenu, setSettingsMenu] = useState(false);
    const [inventoryMenu, setInventoryMenu] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    // Xác định tab hiện tại dựa trên URL
    const getCurrentTab = () => {
        if (location.pathname.includes("dashboard")) return "dashboard";
        if (location.pathname.includes("tables")) return "tables";
        if (location.pathname.includes("areas")) return "areas";
        if (location.pathname.includes("employees")) return "employees";
        if (location.pathname.includes("permissions")) return "permissions";
        if (location.pathname.includes("manage-categories")) return "categories";
        if (location.pathname.includes("products")) return "products";
        if (location.pathname.includes("deleted-menu-items")) return "trash";
        if (location.pathname.includes("inventory-list")) return "inventory-list";
        if (location.pathname.includes("inventory")) return "inventory";
        if (location.pathname.includes("recipes")) return "recipes";
        if (location.pathname.includes("import-receipts")) return "import-receipts";
        return "dashboard";
    };

    const currentTab = getCurrentTab();

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
                    onClick={() => navigate("/dashboard")}
                >
                    <FaChartBar className="sidebar-icon" />
                    {!collapsed && <span>Thống kê</span>}
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
                            onClick={() => navigate("/table-layout")}
                        >
                            <FaList className="sidebar-icon" />
                            <span>Quản lý bàn</span>
                        </li>
                        <li
                            className={currentTab === "reservations" ? "active" : ""}
                            onClick={() => navigate("/reservation-management")}
                        >
                            <FaList className="sidebar-icon" />
                            <span>Quản lý đặt bàn</span>
                        </li>
                        <li
                            className={currentTab === "areas" ? "active" : ""}
                            onClick={() => navigate("/areas")}
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
                            className={currentTab === "categories" ? "active" : ""}
                            onClick={() => navigate("/chef/manage-categories")}
                        >
                            <FaList className="sidebar-icon" />
                            <span>Danh mục sản phẩm</span>
                        </li>
                        <li
                            className={currentTab === "products" ? "active" : ""}
                            onClick={() => navigate("/chef/products")}
                        >
                            <FaUtensils className="sidebar-icon" />
                            <span>Sản phẩm</span>
                        </li>
                        <li
                            className={currentTab === "trash" ? "active" : ""}
                            onClick={() => navigate("/chef/deleted-menu-items")}
                        >
                            <FaTrash className="sidebar-icon" />
                            <span>Sản phẩm tạm xóa</span>
                        </li>
                    </ul>
                )}

                {/* Quản lý nguyên liệu */}
                <li
                    className={`menu-parent ${collapsed ? "collapsed" : ""}`}
                    onClick={() => setInventoryMenu((v) => !v)}
                >
                    <FaBoxes className="sidebar-icon" />
                    {!collapsed && (
                        <>
                            <span>Quản lý nguyên liệu</span>
                            <FaChevronDown className={`chevron ${inventoryMenu ? "open" : ""}`} />
                        </>
                    )}
                </li>

                {/* Submenu nguyên liệu */}
                {!collapsed && (
                    <ul className={`chef-sidebar-submenu ${inventoryMenu ? "open" : ""}`}>
                        <li
                            className={currentTab === "inventory-list" ? "active" : ""}
                            onClick={() => navigate("/chef/inventory-list")}
                        >
                            <FaBoxes className="sidebar-icon" />
                            <span>Kho Nguyên Liệu</span>
                        </li>
                        <li
                            className={currentTab === "recipes" ? "active" : ""}
                            onClick={() => navigate("/chef/recipes")}
                        >
                            <FaReceipt className="sidebar-icon" />
                            <span>Công thức món ăn</span>
                        </li>
                        <li
                            className={currentTab === "import-receipts" ? "active" : ""}
                            onClick={() => navigate("/chef/import-receipts")}
                        >
                            <FaFileInvoice className="sidebar-icon" />
                            <span>Phiếu nhập hàng</span>
                        </li>
                    </ul>
                )}

                {/* Nhân viên */}
                <li
                    className={`menu-parent ${collapsed ? "collapsed" : ""}`}
                    onClick={() => setEmployeeMenu((v) => !v)}
                >
                    <FaUserTie className="sidebar-icon" />
                    {!collapsed && (
                        <>
                            <span>Nhân viên</span>
                            <FaChevronDown className={`chevron ${employeeMenu ? "open" : ""}`} />
                        </>
                    )}
                </li>

                {/* Submenu nhân viên */}
                {!collapsed && (
                    <ul className={`chef-sidebar-submenu ${employeeMenu ? "open" : ""}`}>
                        <li
                            className={currentTab === "employees" ? "active" : ""}
                            onClick={() => navigate("/dashboard/employees")}
                        >
                            <FaUsers className="sidebar-icon" />
                            <span>Quản lý nhân viên</span>
                        </li>
                        <li
                            className={currentTab === "permissions" ? "active" : ""}
                            onClick={() => navigate("/dashboard/permissions")}
                        >
                            <FaCog className="sidebar-icon" />
                            <span>Phân quyền</span>
                        </li>
                    </ul>
                )}

                {/* Đơn hàng */}
                <li
                    className={currentTab === "orders" ? "active" : ""}
                    onClick={() => navigate("/orders")}
                >
                    <FaShoppingCart className="sidebar-icon" />
                    {!collapsed && <span>Đơn hàng</span>}
                </li>

                {/* Thanh toán */}
                <li
                    className={currentTab === "payments" ? "active" : ""}
                    onClick={() => navigate("/payments")}
                >
                    <FaCreditCard className="sidebar-icon" />
                    {!collapsed && <span>Thanh toán</span>}
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
