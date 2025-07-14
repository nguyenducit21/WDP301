import React, { useState } from 'react';

const PermissionMatrix = ({ matrix, onPermissionChange }) => {
    const [selectedRole, setSelectedRole] = useState(null);
    const [filterModule, setFilterModule] = useState('all');

    if (!matrix || matrix.length === 0) {
        return <div className="no-data">Không có dữ liệu ma trận phân quyền</div>;
    }

    // Lấy tất cả permissions từ matrix
    const allPermissions = matrix[0]?.permissions || [];

    // Lấy danh sách modules
    const modules = [...new Set(allPermissions.map(p => p.permission.module))];

    // Lọc permissions theo module
    const filteredPermissions = filterModule === 'all'
        ? allPermissions
        : allPermissions.filter(p => p.permission.module === filterModule);

    // Group permissions by module for better display
    const groupedPermissions = filteredPermissions.reduce((acc, permissionData) => {
        const module = permissionData.permission.module;
        if (!acc[module]) {
            acc[module] = [];
        }
        acc[module].push(permissionData);
        return acc;
    }, {});

    const handlePermissionToggle = async (roleId, permissionId, currentValue) => {
        const role = matrix.find(r => r.role.id === roleId);
        if (!role) return;

        const currentPermissions = role.permissions
            .filter(p => p.has_permission)
            .map(p => p.permission.id);

        let newPermissions;
        if (currentValue) {
            // Remove permission
            newPermissions = currentPermissions.filter(id => id !== permissionId);
        } else {
            // Add permission
            newPermissions = [...currentPermissions, permissionId];
        }

        await onPermissionChange(roleId, newPermissions);
    };

    const getRolePermissionStatus = (roleId, permissionId) => {
        const role = matrix.find(r => r.role.id === roleId);
        if (!role) return false;

        const permissionData = role.permissions.find(p => p.permission.id === permissionId);
        return permissionData?.has_permission || false;
    };

    const getModulePermissionCount = (roleId, module) => {
        const role = matrix.find(r => r.role.id === roleId);
        if (!role) return { total: 0, granted: 0 };

        const modulePermissions = role.permissions.filter(p => p.permission.module === module);
        const grantedPermissions = modulePermissions.filter(p => p.has_permission);

        return {
            total: modulePermissions.length,
            granted: grantedPermissions.length
        };
    };

    return (
        <div className="permission-matrix">
            <div className="matrix-controls">
                <div className="filter-group">
                    <label htmlFor="moduleFilter">Lọc theo module:</label>
                    <select
                        id="moduleFilter"
                        value={filterModule}
                        onChange={(e) => setFilterModule(e.target.value)}
                    >
                        <option value="all">Tất cả modules</option>
                        {modules.map(module => (
                            <option key={module} value={module}>
                                {module}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="legend">
                    <span className="legend-item">
                        <span className="legend-color granted"></span>
                        Có quyền
                    </span>
                    <span className="legend-item">
                        <span className="legend-color denied"></span>
                        Không có quyền
                    </span>
                    <span className="legend-item">
                        <span className="legend-color system"></span>
                        Vai trò hệ thống
                    </span>
                </div>
            </div>

            <div className="matrix-container">
                <div className="matrix-table-wrapper">
                    <table className="matrix-table">
                        <thead>
                            <tr>
                                <th className="permission-header-main">Quyền / Vai trò</th>
                                {matrix.map(roleData => (
                                    <th key={roleData.role.id} className={`role-header ${roleData.role.is_system_role ? 'system-role' : ''}`}>
                                        <div className="role-header-content">
                                            <span className="role-name">{roleData.role.name}</span>
                                            {roleData.role.is_system_role && (
                                                <span className="role-type-badge system">Hệ thống</span>
                                            )}
                                            <span className="role-description">
                                                {roleData.role.description}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPermissions.map(permissionData => (
                                <tr key={permissionData.permission.id}>
                                    <td className="permission-cell-main">
                                        <div className="permission-info">
                                            <span className="permission-name">
                                                {permissionData.permission.name}
                                            </span>
                                            <span className={`action-badge ${permissionData.permission.action}`}>
                                                {permissionData.permission.action}
                                            </span>
                                            <span className="permission-resource">
                                                {permissionData.permission.resource}
                                            </span>
                                            {permissionData.permission.description && (
                                                <span className="permission-description">
                                                    {permissionData.permission.description}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    {matrix.map(roleData => {
                                        const hasPermission = getRolePermissionStatus(
                                            roleData.role.id,
                                            permissionData.permission.id
                                        );

                                        return (
                                            <td key={roleData.role.id} className="role-permission-cell">
                                                <label className="permission-toggle">
                                                    <input
                                                        type="checkbox"
                                                        checked={hasPermission}
                                                        onChange={() => handlePermissionToggle(
                                                            roleData.role.id,
                                                            permissionData.permission.id,
                                                            hasPermission
                                                        )}
                                                        disabled={roleData.role.is_system_role}
                                                    />
                                                    <span className={`toggle-indicator ${hasPermission ? 'granted' : 'denied'} ${roleData.role.is_system_role ? 'system' : ''}`}>
                                                        {hasPermission ? '✓' : '✗'}
                                                    </span>
                                                </label>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Module Summary */}
            {filterModule === 'all' && (
                <div className="module-summary">
                    <h3>Tổng quan theo module</h3>
                    <div className="summary-grid">
                        {modules.map(module => (
                            <div key={module} className="module-summary-card">
                                <h4>{module}</h4>
                                <div className="role-summaries">
                                    {matrix.map(roleData => {
                                        const counts = getModulePermissionCount(roleData.role.id, module);
                                        const percentage = counts.total > 0
                                            ? Math.round((counts.granted / counts.total) * 100)
                                            : 0;

                                        return (
                                            <div key={roleData.role.id} className="role-summary">
                                                <span className="role-name">{roleData.role.name}</span>
                                                <div className="permission-progress">
                                                    <div
                                                        className="progress-bar"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                    <span className="progress-text">
                                                        {counts.granted}/{counts.total} ({percentage}%)
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionMatrix;
