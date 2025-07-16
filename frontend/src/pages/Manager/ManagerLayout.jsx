import React, { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import ManagerSidebar from "./ManagerSidebar";

const SIDEBAR_WIDTH = 250;
const SIDEBAR_COLLAPSED = 80;

const ManagerLayout = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div>
            <ManagerSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <div
                className="manager-main-content"
                style={{
                    marginLeft: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH,
                    transition: "margin-left 0.23s",
                    padding: "20px",
                }}
            >
                {window.location.pathname === "/manager" && <Navigate to="/manager/dashboard" replace />}
                <Outlet />
            </div>
        </div>
    );
};

export default ManagerLayout;