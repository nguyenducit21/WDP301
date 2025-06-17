import React, { useState } from "react";
import { FaHome, FaUtensils, FaChevronDown, FaList, FaTrash, FaBoxes, FaReceipt } from "react-icons/fa";
import "./SidebarChef.css";
import logo from "../../assets/logo.png";
import { useNavigate, useLocation } from "react-router-dom";

const ChefSidebar = ({ collapsed, setCollapsed }) => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [inventoryMenu, setInventoryMenu] = useState(false); // Thêm state cho menu nguyên liệu
  const navigate = useNavigate();
  const location = useLocation();

  // Xác định tab hiện tại dựa trên URL
  const getCurrentTab = () => {
    if (location.pathname.includes("dashboard")) return "dashboard";
    if (location.pathname.includes("manage-categories")) return "categories";
    if (location.pathname.includes("products")) return "products";
    if (location.pathname.includes("deleted-menu-items")) return "trash";
    if (location.pathname.includes("inventory")) return "inventory";
    if (location.pathname.includes("recipes")) return "recipes";
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
          onClick={() => navigate("/chef/dashboard")}
        >
          <FaHome className="sidebar-icon" />
          {!collapsed && <span>Dashboard</span>}
        </li>

        {/* Quản lý món ăn */}
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
        
        {/* Submenu món ăn */}
        {!collapsed && (
          <ul className={`chef-sidebar-submenu ${mobileMenu ? "open" : ""}`}>
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

        {/* Quản lý nguyên liệu - THÊM MỚI */}
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
        
        {/* Submenu nguyên liệu - THÊM MỚI */}
        {!collapsed && (
          <ul className={`chef-sidebar-submenu ${inventoryMenu ? "open" : ""}`}>
            <li
              className={currentTab === "inventory" ? "active" : ""}
              onClick={() => navigate("/chef/inventory")}
            >
              <FaBoxes className="sidebar-icon" />
              <span>Danh sách nguyên liệu</span>
            </li>
            <li
              className={currentTab === "recipes" ? "active" : ""}
              onClick={() => navigate("/chef/recipes")}
            >
              <FaReceipt className="sidebar-icon" />
              <span>Công thức món ăn</span>
            </li>
          </ul>
        )}
      </ul>
    </div>
  );
};

export default ChefSidebar;
