import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios.customize';
import './EmployeeManagement.css';
import EmployeeForm from './EmployeeForm';
import ConfirmModal from './ConfirmModal';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    
    // Filters and pagination
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        status: '',
        page: 1,
        limit: 10
    });
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        fetchEmployees();
        fetchRoles();
    }, [filters]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/employees', { params: filters });
            setEmployees(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách nhân viên:', error);
            alert('Lỗi khi lấy danh sách nhân viên');
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await axios.get('/permissions/roles');
            // Lọc bỏ role customer
            const filteredRoles = response.data.data.filter(role => role.name !== 'customer');
            setRoles(filteredRoles);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách roles:', error);
        }
    };

    const handleCreateEmployee = () => {
        setEditingEmployee(null);
        setShowForm(true);
    };

    const handleEditEmployee = (employee) => {
        setEditingEmployee(employee);
        setShowForm(true);
    };

    const handleDeleteEmployee = (employee) => {
        setEmployeeToDelete(employee);
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`/employees/${employeeToDelete._id}`);
            alert('Xóa nhân viên thành công');
            fetchEmployees();
        } catch (error) {
            console.error('Lỗi khi xóa nhân viên:', error);
            alert('Lỗi khi xóa nhân viên');
        } finally {
            setShowConfirmModal(false);
            setEmployeeToDelete(null);
        }
    };

    const handleFormSubmit = async (formData) => {
        try {
            if (editingEmployee) {
                await axios.put(`/employees/${editingEmployee._id}`, formData);
                alert('Cập nhật nhân viên thành công');
            } else {
                await axios.post('/employees', formData);
                alert('Tạo nhân viên thành công');
            }
            setShowForm(false);
            setEditingEmployee(null);
            fetchEmployees();
        } catch (error) {
            console.error('Lỗi khi lưu nhân viên:', error);
            alert(error.response?.data?.message || 'Lỗi khi lưu nhân viên');
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1 // Reset về trang đầu khi filter
        }));
    };

    const handlePageChange = (newPage) => {
        setFilters(prev => ({
            ...prev,
            page: newPage
        }));
    };

    const getStatusBadge = (status) => {
        return (
            <span className={`status-badge ${status}`}>
                {status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
            </span>
        );
    };

    const getRoleBadge = (roleName) => {
        const roleColors = {
            admin: 'admin',
            manager: 'manager',
            kitchen_staff: 'kitchen',
            waiter: 'waiter',
            warehouse_staff: 'warehouse'
        };
        
        return (
            <span className={`role-badge ${roleColors[roleName] || 'default'}`}>
                {roleName}
            </span>
        );
    };

    return (
        <div className="employee-management">
            <div className="page-header">
                <h1>Quản lý nhân viên</h1>
                <button 
                    className="btn btn-primary"
                    onClick={handleCreateEmployee}
                >
                    Thêm nhân viên
                </button>
            </div>

            {/* Filters */}
            <div className="filters">
                <div className="filter-group">
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, email, username..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="filter-group">
                    <select
                        value={filters.role}
                        onChange={(e) => handleFilterChange('role', e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Tất cả vai trò</option>
                        {roles.map(role => (
                            <option key={role._id} value={role.name}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Hoạt động</option>
                        <option value="inactive">Không hoạt động</option>
                    </select>
                </div>
            </div>

            {/* Employee Table */}
            <div className="table-container">
                {loading ? (
                    <div className="loading">Đang tải...</div>
                ) : (
                    <table className="employee-table">
                        <thead>
                            <tr>
                                <th>Tên đăng nhập</th>
                                <th>Họ tên</th>
                                <th>Email</th>
                                <th>Số điện thoại</th>
                                <th>Vai trò</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(employee => (
                                <tr key={employee._id}>
                                    <td>{employee.username}</td>
                                    <td>{employee.full_name || '-'}</td>
                                    <td>{employee.email}</td>
                                    <td>{employee.phone || '-'}</td>
                                    <td>{getRoleBadge(employee.role_id?.name)}</td>
                                    <td>{getStatusBadge(employee.status)}</td>
                                    <td>{new Date(employee.created_at).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleEditEmployee(employee)}
                                            >
                                                Sửa
                                            </button>
                                            {employee.role_id?.name !== 'admin' && (
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDeleteEmployee(employee)}
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
                )}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
                <div className="pagination">
                    <button
                        className="btn btn-sm"
                        disabled={pagination.current_page === 1}
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                    >
                        Trước
                    </button>
                    
                    <span className="page-info">
                        Trang {pagination.current_page} / {pagination.total_pages}
                    </span>
                    
                    <button
                        className="btn btn-sm"
                        disabled={pagination.current_page === pagination.total_pages}
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                    >
                        Sau
                    </button>
                </div>
            )}

            {/* Employee Form Modal */}
            {showForm && (
                <EmployeeForm
                    employee={editingEmployee}
                    roles={roles}
                    onSubmit={handleFormSubmit}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingEmployee(null);
                    }}
                />
            )}

            {/* Confirm Delete Modal */}
            {showConfirmModal && (
                <ConfirmModal
                    title="Xác nhận xóa nhân viên"
                    message={`Bạn có chắc chắn muốn xóa nhân viên "${employeeToDelete?.full_name || employeeToDelete?.username}"?`}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowConfirmModal(false);
                        setEmployeeToDelete(null);
                    }}
                />
            )}
        </div>
    );
};

export default EmployeeManagement;
