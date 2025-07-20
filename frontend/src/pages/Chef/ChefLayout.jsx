import React, { useState } from "react";
import ChefSidebar from "./SidebarChef";
import { Outlet } from "react-router-dom";
import { Navigate } from "react-router-dom"; // Thêm để điều hướng mặc định

const SIDEBAR_WIDTH = 250;
const SIDEBAR_COLLAPSED = 80; // Sửa lỗi đánh máy

const ChefLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <ChefSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            position: "fixed",
            top: 20,
            left: 90,
            zIndex: 2000,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            cursor: "pointer"
          }}
          aria-label="Mở sidebar"
        >
          ☰
        </button>
      )}
      <div
        className="chef-main-content"
        style={{
          marginLeft: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH,
          transition: "margin-left 0.23s",
          padding: "20px",
        }}
      >
        {window.location.pathname === "/chef" && <Navigate to="/chef/orders" replace />}
        <Outlet />
      </div>
    </div>
  );
};

export default ChefLayout;