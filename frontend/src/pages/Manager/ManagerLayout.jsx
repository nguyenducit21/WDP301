import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarManager from '../../components/SidebarManager/SidebarManager';
import './ManagerLayout.css';

const ManagerLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="manager-layout">
            <SidebarManager collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
            <div className={`manager-content${sidebarCollapsed ? ' collapsed' : ''}`}>
                <Outlet />
            </div>
        </div>
    );
};

export default ManagerLayout; 