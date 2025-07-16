import React, { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

const SIDEBAR_WIDTH = 250;
const SIDEBAR_COLLAPSED = 80;

const AdminLayout = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div>
            <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <div
                className="admin-main-content"
                style={{
                    marginLeft: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH,
                    transition: "margin-left 0.23s",
                    padding: "20px",
                }}
            >
                {window.location.pathname === "/admin" && <Navigate to="/admin/dashboard" replace />}
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;