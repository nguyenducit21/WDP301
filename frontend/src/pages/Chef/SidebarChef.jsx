import React, { useState } from "react";
import {
  FaHome,
  FaUtensils,
  FaChevronDown,
  FaList,
  FaTrash,
  FaBoxes,
  FaReceipt,
  FaFileInvoice,
  FaChartLine
} from "react-icons/fa";
import "./SidebarChef.css";
import logo from "../../assets/logo.png";
import { useNavigate, useLocation } from "react-router-dom";

const ChefSidebar = ({ collapsed, setCollapsed }) => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [inventoryMenu, setInventoryMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentTab = () => {
    if (location.pathname.includes("orders")) return "orders";
    if (location.pathname.includes("manage-categories")) return "categories";
    if (location.pathname.includes("products")) return "products";
    if (location.pathname.includes("deleted-menu-items")) return "trash";
    if (location.pathname.includes("inventory/analytics")) return "inventory-analytics";
    if (location.pathname.includes("inventory-list")) return "inventory-list";
    if (location.pathname.includes("inventory")) return "inventory";
    if (location.pathname.includes("recipes")) return "recipes";
    if (location.pathname.includes("import-receipts")) return "import-receipts";
    return "orders";
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
        <li
          className={currentTab === "orders" ? "active" : ""}
          onClick={() => navigate("/chef/orders")}
        >
          <FaHome className="sidebar-icon" />
          {!collapsed && <span>Đơn hàng</span>}
        </li>

        <li
          className={`menu-parent ${collapsed ? "collapsed" : ""}`}
          onClick={() => setMobileMenu((v) => !v)}
        >
          <FaUtensils className="sidebar-icon" />
          {!collapsed && (
            <>
              <span>Quản lý món ăn</span>
              <FaChevronDown className={`chevron ${mobileMenu ? "open" : ""}`} />
            </>
          )}
        </li>

        {!collapsed && (
          <ul className={`chef-sidebar-submenu ${mobileMenu ? "open" : ""}`}>
            <li
              className={currentTab === "menu-dashboard" ? "active" : ""}
              onClick={() => navigate("/chef/menu/dashboard")}
            >
              <FaChartLine className="sidebar-icon" />
              <span>Dashboard Menu</span>
            </li>
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

        {!collapsed && (
          <ul className={`chef-sidebar-submenu ${inventoryMenu ? "open" : ""}`}>
            <li
              className={currentTab === "inventory-analytics" ? "active" : ""}
              onClick={() => navigate("/chef/inventory/analytics")}
            >
              <FaChartLine className="sidebar-icon" />
              <span>Dashboard Đề Xuất</span>
            </li>
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
      </ul>
    </div>
  );
};

export default ChefSidebar;
