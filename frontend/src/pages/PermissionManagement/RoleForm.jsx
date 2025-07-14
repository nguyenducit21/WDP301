import React, { useState, useEffect } from 'react';

const RoleForm = ({ role, permissions, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permission_ids: [],
        status: 'active'
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedModule, setSelectedModule] = useState('all');

    useEffect(() => {
        if (role) {
            setFormData({
                name: role.name || '',
                description: role.description || '',
                permission_ids: role.permissions?.map(p => p._id) || [],
                status: role.status || 'active'
            });
        }
    }, [role]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Tên vai trò là bắt buộc';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Lỗi khi submit form:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handlePermissionChange = (permissionId, checked) => {
        setFormData(prev => ({
            ...prev,
            permission_ids: checked 
                ? [...prev.permission_ids, permissionId]
                : prev.permission_ids.filter(id => id !== permissionId)
        }));
    };

    const handleSelectAllModule = (module) => {
        const modulePermissions = getPermissionsByModule()[module] || [];
        const modulePermissionIds = modulePermissions.map(p => p._id);
        
        const allSelected = modulePermissionIds.every(id => 
            formData.permission_ids.includes(id)
        );

        if (allSelected) {
            // Deselect all in module
            setFormData(prev => ({
                ...prev,
                permission_ids: prev.permission_ids.filter(id => 
                    !modulePermissionIds.includes(id)
                )
            }));
        } else {
            // Select all in module
            setFormData(prev => ({
                ...prev,
                permission_ids: [...new Set([...prev.permission_ids, ...modulePermissionIds])]
            }));
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

    const getFilteredPermissions = () => {
        if (selectedModule === 'all') {
            return getPermissionsByModule();
        }
        const grouped = getPermissionsByModule();
        return { [selectedModule]: grouped[selectedModule] || [] };
    };

    const modules = Object.keys(getPermissionsByModule());

    return (
        <div className="modal-overlay">
            <div className="modal-content role-form-modal">
                <div className="modal-header">
                    <h2>{role ? 'Sửa vai trò' : 'Tạo vai trò mới'}</h2>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="role-form">
                    <div className="form-section">
                        <h3>Thông tin cơ bản</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="name">Tên vai trò *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={errors.name ? 'error' : ''}
                                    disabled={loading || (role && role.is_system_role)}
                                />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="status">Trạng thái</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    disabled={loading}
                                >
                                    <option value="active">Hoạt động</option>
                                    <option value="inactive">Không hoạt động</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Mô tả</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                disabled={loading}
                                placeholder="Mô tả vai trò..."
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <div className="permissions-header">
                            <h3>Phân quyền</h3>
                            <div className="module-filter">
                                <label htmlFor="moduleFilter">Lọc theo module:</label>
                                <select
                                    id="moduleFilter"
                                    value={selectedModule}
                                    onChange={(e) => setSelectedModule(e.target.value)}
                                >
                                    <option value="all">Tất cả modules</option>
                                    {modules.map(module => (
                                        <option key={module} value={module}>
                                            {module}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="permissions-container">
                            {Object.entries(getFilteredPermissions()).map(([module, modulePermissions]) => {
                                const modulePermissionIds = modulePermissions.map(p => p._id);
                                const allSelected = modulePermissionIds.every(id => 
                                    formData.permission_ids.includes(id)
                                );
                                const someSelected = modulePermissionIds.some(id => 
                                    formData.permission_ids.includes(id)
                                );

                                return (
                                    <div key={module} className="module-permissions">
                                        <div className="module-header">
                                            <label className="module-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    ref={input => {
                                                        if (input) input.indeterminate = someSelected && !allSelected;
                                                    }}
                                                    onChange={() => handleSelectAllModule(module)}
                                                />
                                                <span className="module-title">{module}</span>
                                                <span className="permission-count">
                                                    ({modulePermissions.length} quyền)
                                                </span>
                                            </label>
                                        </div>

                                        <div className="permissions-grid">
                                            {modulePermissions.map(permission => (
                                                <label key={permission._id} className="permission-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.permission_ids.includes(permission._id)}
                                                        onChange={(e) => handlePermissionChange(
                                                            permission._id, 
                                                            e.target.checked
                                                        )}
                                                    />
                                                    <div className="permission-info">
                                                        <span className="permission-name">
                                                            {permission.name}
                                                        </span>
                                                        <span className={`action-badge ${permission.action}`}>
                                                            {permission.action}
                                                        </span>
                                                        <span className="permission-resource">
                                                            {permission.resource}
                                                        </span>
                                                        {permission.description && (
                                                            <span className="permission-description">
                                                                {permission.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Đang lưu...' : (role ? 'Cập nhật' : 'Tạo mới')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleForm;
