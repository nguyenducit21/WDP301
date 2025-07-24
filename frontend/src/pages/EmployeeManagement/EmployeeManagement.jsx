import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axios.customize';
import './EmployeeManagement.css';
import EmployeeForm from './EmployeeForm';
import ConfirmModal from './ConfirmModal';
import { AuthContext } from '../../context/AuthContext';

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

    const { user } = useContext(AuthContext);
    const currentRole = user?.user?.role;

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
            const response = await axios.get('/permissions/roles-for-selection');
            console.log("RAW ROLE DATA:", response.data.data); // Debug log

            // Lọc bỏ role customer
            const filteredRoles = response.data.data.filter(role => role.name !== 'customer');
            setRoles(filteredRoles);
            console.log("FILTERED ROLES:", filteredRoles); // Debug log

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

    const handleToggleStatus = (employee) => {
        setEmployeeToDelete(employee);
        setShowConfirmModal(true);
    };

    const confirmToggleStatus = async () => {
        try {
            await axios.patch(`/employees/${employeeToDelete._id}/toggle-status`);
            const action = employeeToDelete.status === 'active' ? 'vô hiệu hóa' : 'kích hoạt';
            alert(`${action.charAt(0).toUpperCase() + action.slice(1)} nhân viên thành công`);
            fetchEmployees();
        } catch (error) {
            console.error('Lỗi khi thay đổi trạng thái nhân viên:', error);
            alert(error.response?.data?.message || 'Lỗi khi thay đổi trạng thái nhân viên');
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
                const response = await axios.post('/employees', formData);
                alert(response.data.message || 'Tạo nhân viên thành công. Thông tin đăng nhập đã được gửi qua email.');
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

    const getRoleBadge = (role) => {
        // Xác định tên vai trò
        let roleName = '';
        if (typeof role === 'string') {
            roleName = role;
        } else if (role && typeof role === 'object') {
            // Nếu role là một đối tượng, lấy tên từ thuộc tính name hoặc _id
            roleName = role.name || (role._id ? role._id.toString() : '');
        } else if (role && role.role_id && typeof role.role_id === 'object') {
            // Trường hợp role là nested object với role_id
            roleName = role.role_id.name || '';
        }

        // Nếu không xác định được tên vai trò, trả về default
        if (!roleName) {
            return <span className="role-badge default">Không xác định</span>;
        }

        const roleColors = {
            admin: 'admin',
            manager: 'manager',
            kitchen_staff: 'kitchen',
            waiter: 'waiter',
            warehouse_staff: 'warehouse',
            chef: 'kitchen',
            customer: 'default'
        };

        return (
            <span className={`role-badge ${roleColors[roleName] || 'default'}`}>
                {roleName}
            </span>
        );
    };

    // Lọc employees: nếu là manager thì ẩn admin
    const filteredEmployees = currentRole === 'manager'
        ? employees.filter(emp => {
            const roleName = emp.role_id?.name || emp.role?.name || emp.role;
            return roleName !== 'admin';
        })
        : employees;
    // Lọc roles cho filter (dropdown filter ngoài giao diện):
    const filteredRolesForFilter = currentRole === 'manager'
        ? roles.filter(role => role.name !== 'admin')
        : roles;
    // Lọc roles cho form thêm/sửa:
    const filteredRolesForForm = currentRole === 'manager'
        ? roles.filter(role => role.name !== 'admin' && role.name !== 'manager')
        : currentRole === 'admin'
            ? roles.filter(role => role.name !== 'admin')
            : roles;

    console.log("Current Role:", currentRole); // Debug log
    console.log("All Roles:", roles); // Debug log
    console.log("Filtered Roles For Form:", filteredRolesForForm); // Debug log

    //format birth_date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date)) return '-';
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    return (
        <div className="employee-management-container">
            <div className="employee-management" style={{
                transition: 'margin-left 0.2s',
                width: '100%'
            }}>
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
                            {filteredRolesForFilter.map(role => (
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
                                    <th>Tên nhân viên</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Số điện thoại</th>
                                    <th>Ngày sinh</th>
                                    <th>Vai trò</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(employee => {
                                        const isAdminRow = (employee.role_id?.name || employee.role?.name || employee.role) === 'admin';
                                        return (
                                            <tr key={employee._id}>
                                                <td>{employee.full_name || '-'}</td>
                                                <td>{employee.username}</td>
                                                <td>{employee.email}</td>
                                                <td>{employee.phone || '-'}</td>
                                                <td>{formatDate(employee.birth_date)}</td>
                                                <td>
                                                    {employee.role_id ?
                                                        getRoleBadge(employee.role_id) :
                                                        employee.role ?
                                                            getRoleBadge(employee.role) :
                                                            <span className="role-badge default">Không xác định</span>
                                                    }
                                                </td>
                                                <td>{getStatusBadge(employee.status)}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => handleEditEmployee(employee)}
                                                        >
                                                            Sửa
                                                        </button>
                                                        {/* Ẩn nút vô hiệu hóa nếu là admin và đang xem bằng admin */}
                                                        {!(currentRole === 'admin' && isAdminRow) && (
                                                            <button
                                                                className="btn btn-sm btn-warning"
                                                                onClick={() => handleToggleStatus(employee)}
                                                            >
                                                                {employee.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center' }}>
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="pagination">
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handlePageChange(filters.page - 1)}
                            disabled={filters.page === 1}
                        >
                            Trang trước
                        </button>
                        <span className="page-info">
                            Trang {filters.page} / {pagination.totalPages}
                        </span>
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handlePageChange(filters.page + 1)}
                            disabled={filters.page === pagination.totalPages}
                        >
                            Trang sau
                        </button>
                    </div>
                )}
            </div>
            {/* Employee Form Modal */}
            {showForm && (
                <EmployeeForm
                    employee={editingEmployee}
                    roles={filteredRolesForForm}
                    currentRole={currentRole}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setShowForm(false)}
                />
            )}
            {/* Confirm Modal */}
            {showConfirmModal && (
                <ConfirmModal
                    title={`${employeeToDelete?.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'} tài khoản`}
                    message={`Bạn có chắc muốn ${employeeToDelete?.status === 'active' ? 'vô hiệu hóa' : 'kích hoạt'} tài khoản của ${employeeToDelete?.full_name || 'nhân viên này'}?`}
                    onConfirm={confirmToggleStatus}
                    onCancel={() => setShowConfirmModal(false)}
                />
            )}
        </div>
    );
};

export default EmployeeManagement;
