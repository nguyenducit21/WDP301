import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios.customize';
import './PermissionManagement.css';
import RoleForm from './RoleForm';
import PermissionMatrix from './PermissionMatrix';
import ConfirmModal from '../EmployeeManagement/ConfirmModal';

const PermissionManagement = () => {
    const [activeTab, setActiveTab] = useState('roles');
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [matrix, setMatrix] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRoleForm, setShowRoleForm] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rolesResponse, permissionsResponse, matrixResponse] = await Promise.all([
                axios.get('/permissions/roles'),
                axios.get('/permissions/permissions'),
                axios.get('/permissions/matrix')
            ]);

            setRoles(rolesResponse.data.data);
            setPermissions(permissionsResponse.data.data.permissions);
            setMatrix(matrixResponse.data.data.matrix);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu:', error);
            alert('Lỗi khi lấy dữ liệu phân quyền');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = () => {
        setEditingRole(null);
        setShowRoleForm(true);
    };

    const handleEditRole = (role) => {
        setEditingRole(role);
        setShowRoleForm(true);
    };

    const handleDeleteRole = (role) => {
        setRoleToDelete(role);
        setShowConfirmModal(true);
    };

    const confirmDeleteRole = async () => {
        try {
            await axios.delete(`/permissions/roles/${roleToDelete._id}`);
            alert('Xóa vai trò thành công');
            fetchData();
        } catch (error) {
            console.error('Lỗi khi xóa vai trò:', error);
            alert(error.response?.data?.message || 'Lỗi khi xóa vai trò');
        } finally {
            setShowConfirmModal(false);
            setRoleToDelete(null);
        }
    };

    const handleRoleFormSubmit = async (formData) => {
        try {
            if (editingRole) {
                await axios.put(`/permissions/roles/${editingRole._id}`, formData);
                alert('Cập nhật vai trò thành công');
            } else {
                await axios.post('/permissions/roles', formData);
                alert('Tạo vai trò thành công');
            }
            setShowRoleForm(false);
            setEditingRole(null);
            fetchData();
        } catch (error) {
            console.error('Lỗi khi lưu vai trò:', error);
            alert(error.response?.data?.message || 'Lỗi khi lưu vai trò');
        }
    };

    const handlePermissionChange = async (roleId, permissionIds) => {
        try {
            await axios.put(`/permissions/roles/${roleId}/permissions`, {
                permission_ids: permissionIds
            });
            alert('Cập nhật quyền thành công');
            fetchData();
        } catch (error) {
            console.error('Lỗi khi cập nhật quyền:', error);
            alert(error.response?.data?.message || 'Lỗi khi cập nhật quyền');
        }
    };

    const getPermissionsByModule = () => {
        const grouped = {};
        permissions.forEach(permission => {
            if (!grouped[permission.module]) {
                grouped[permission.module] = [];
            }
            grouped[permission.module].push(permission);
        });
        return grouped;
    };

    const getRoleStatusBadge = (role) => {
        if (role.is_system_role) {
            return <span className="role-type-badge system">Hệ thống</span>;
        }
        return <span className="role-type-badge custom">Tùy chỉnh</span>;
    };

    if (loading) {
        return <div className="loading">Đang tải...</div>;
    }

    return (
        <div className="permission-management">
            <div className="page-header">
                <h1>Quản lý phân quyền</h1>
                <button
                    className="btn btn-primary"
                    onClick={handleCreateRole}
                >
                    Tạo vai trò mới
                </button>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    Quản lý vai trò
                </button>
                <button
                    className={`tab ${activeTab === 'matrix' ? 'active' : ''}`}
                    onClick={() => setActiveTab('matrix')}
                >
                    Ma trận phân quyền
                </button>
                <button
                    className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('permissions')}
                >
                    Danh sách quyền
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'roles' && (
                    <div className="roles-tab">
                        <div className="table-container">
                            <table className="roles-table">
                                <thead>
                                    <tr>
                                        <th>Tên vai trò</th>
                                        <th>Mô tả</th>
                                        <th>Loại</th>
                                        <th>Số quyền</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.map(role => (
                                        <tr key={role._id}>
                                            <td className="role-name">{role.name}</td>
                                            <td>{role.description || '-'}</td>
                                            <td>{getRoleStatusBadge(role)}</td>
                                            <td>
                                                <span className="permission-count">
                                                    {role.permissions?.length || 0} quyền
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${role.status || 'active'}`}>
                                                    {role.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => handleEditRole(role)}
                                                    >
                                                        Sửa
                                                    </button>
                                                    {!role.is_system_role && (
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDeleteRole(role)}
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'matrix' && (
                    <PermissionMatrix
                        matrix={matrix}
                        onPermissionChange={handlePermissionChange}
                    />
                )}

                {activeTab === 'permissions' && (
                    <div className="permissions-tab">
                        <div className="permissions-by-module">
                            {Object.entries(getPermissionsByModule()).map(([module, modulePermissions]) => (
                                <div key={module} className="module-section">
                                    <h3 className="module-title">{module}</h3>
                                    <div className="permissions-grid">
                                        {modulePermissions.map(permission => (
                                            <div key={permission._id} className="permission-card">
                                                <div className="permission-header">
                                                    <span className="permission-name">{permission.name}</span>
                                                    <span className={`action-badge ${permission.action}`}>
                                                        {permission.action}
                                                    </span>
                                                </div>
                                                <div className="permission-details">
                                                    <div className="permission-resource">
                                                        Resource: {permission.resource}
                                                    </div>
                                                    {permission.description && (
                                                        <div className="permission-description">
                                                            {permission.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Role Form Modal */}
            {showRoleForm && (
                <RoleForm
                    role={editingRole}
                    permissions={permissions}
                    onSubmit={handleRoleFormSubmit}
                    onCancel={() => {
                        setShowRoleForm(false);
                        setEditingRole(null);
                    }}
                />
            )}

            {/* Confirm Delete Modal */}
            {showConfirmModal && (
                <ConfirmModal
                    title="Xác nhận xóa vai trò"
                    message={`Bạn có chắc chắn muốn xóa vai trò "${roleToDelete?.name}"? Hành động này không thể hoàn tác.`}
                    onConfirm={confirmDeleteRole}
                    onCancel={() => {
                        setShowConfirmModal(false);
                        setRoleToDelete(null);
                    }}
                />
            )}
        </div>
    );
};

export default PermissionManagement;
