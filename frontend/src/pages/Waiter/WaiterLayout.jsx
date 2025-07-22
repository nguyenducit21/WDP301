import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarWaiter from '../../components/SidebarWaiter/SidebarWaiter';
import OrderAssignmentNotification from '../../components/OrderAssignmentNotification/OrderAssignmentNotification';
import './WaiterLayout.css';

const WaiterLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="waiter-layout">
            <SidebarWaiter
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
            />
            <div className={`waiter-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <Outlet />
            </div>
            <OrderAssignmentNotification />
        </div>
    );
};

export default WaiterLayout; 