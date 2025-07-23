import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarAdmin from '../../components/SidebarAdmin/SidebarAdmin';
import './AdminLayout.css';

const AdminLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="admin-layout">
            <SidebarAdmin
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
            />
            <div className={`admin-content${sidebarCollapsed ? ' collapsed' : ''}`}>
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;
