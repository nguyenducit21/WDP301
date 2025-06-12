import React, { useState } from "react";
import { FaHome, FaUtensils, FaChevronDown, FaList, FaTrash } from "react-icons/fa";
import "./SidebarChef.css";
import logo from "../../assets/logo.png";
import { useNavigate, useLocation } from "react-router-dom";

const ChefSidebar = ({ collapsed, setCollapsed }) => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Xác định tab hiện tại dựa trên URL
  const getCurrentTab = () => {
    if (location.pathname.includes("dashboard")) return "dashboard";
    if (location.pathname.includes("manage-categories")) return "categories";
    if (location.pathname.includes("products")) return "products";
    if (location.pathname.includes("deleted-menu-items")) return "trash";
    return "dashboard"; // Mặc định
  };

  const currentTab = getCurrentTab();

  // Responsive toggle
  const handleToggle = () => setCollapsed((p) => !p);

  // Handle logo click to expand sidebar when collapsed
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
        <li
          className={currentTab === "dashboard" ? "active" : ""}
          onClick={() => navigate("/chef/dashboard")}
        >
          <FaHome className="sidebar-icon" />
          {!collapsed && <span>Dashboard</span>}
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
        {/* Submenu */}
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
      </ul>
    </div>
  );
};

export default ChefSidebar;