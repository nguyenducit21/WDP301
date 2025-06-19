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
      <div
        className="chef-main-content"
        style={{
          marginLeft: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH,
          transition: "margin-left 0.23s",
          padding: "20px",
        }}
      >
        {window.location.pathname === "/chef" && <Navigate to="/chef/dashboard" replace />}
        <Outlet />
      </div>
    </div>
  );
};

export default ChefLayout;