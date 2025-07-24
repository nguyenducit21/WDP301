import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios.customize';
import './EmployeeManagement.css';
import EmployeeForm from './EmployeeForm';
import ConfirmModal from './ConfirmModal';
import CalendarGrid from '../Manager/CalendarGrid';
import '../Manager/CalendarGrid.css';

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

    // Lấy lịch làm việc của nhân viên theo tháng
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleEmployee, setScheduleEmployee] = useState(null);
    const [scheduleMonth, setScheduleMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [employeeSchedules, setEmployeeSchedules] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [showScheduleCrudModal, setShowScheduleCrudModal] = useState(false);
    const [scheduleModalType, setScheduleModalType] = useState('add');
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [scheduleForm, setScheduleForm] = useState({ employee_id: '', date: '', shift_type: 'morning', start_time: '08:00', end_time: '16:00', notes: '' });


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

    // Lấy lịch làm việc của nhân viên theo tháng
    const fetchEmployeeSchedules = async (employeeId, monthDate) => {
        setScheduleLoading(true);
        try {
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const res = await axios.get(`/schedules/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`);
            if (res.data.success) {
                setEmployeeSchedules(res.data.data.schedules || []);
            }
        } catch (err) {
            setEmployeeSchedules([]);
        } finally {
            setScheduleLoading(false);
        }
    };

    // Khi click vào nhân viên
    const handleShowSchedule = (employee) => {
        setScheduleEmployee(employee);
        setScheduleMonth(new Date());
        setShowScheduleModal(true);
        setSelectedSchedule(null);
        fetchEmployeeSchedules(employee._id, new Date());
    };

    // Điều hướng tháng
    const handleScheduleMonthChange = (delta) => {
        setScheduleMonth(prev => {
            const y = prev.getFullYear();
            const m = prev.getMonth() + delta;
            const newMonth = new Date(y, m, 1);
            if (scheduleEmployee) fetchEmployeeSchedules(scheduleEmployee._id, newMonth);
            return newMonth;
        });
    };

    // Click ngày trên calendar
    const handleScheduleDayClick = (date, hasSchedule) => {
        if (!scheduleEmployee) return;
        const dateStr = date.toISOString().split('T')[0];
        const sch = employeeSchedules.find(s => s.date === dateStr);
        if (sch) {
            setSelectedSchedule(sch);
            setScheduleModalType('edit');
            setScheduleForm({
                employee_id: scheduleEmployee._id,
                date: sch.date,
                shift_type: sch.shiftType || 'morning',
                start_time: sch.startTime || '08:00',
                end_time: sch.endTime || '16:00',
                notes: sch.notes || ''
            });
        } else {
            setSelectedSchedule(null);
            setScheduleModalType('add');
            setScheduleForm({
                employee_id: scheduleEmployee._id,
                date: dateStr,
                shift_type: 'morning',
                start_time: '08:00',
                end_time: '16:00',
                notes: ''
            });
        }
        setShowScheduleCrudModal(true);
    };

    // CRUD schedule
    const handleAddSchedule = async () => {
        try {
            await axios.post('/schedules', scheduleForm);
            setShowScheduleCrudModal(false);
            fetchEmployeeSchedules(scheduleEmployee._id, scheduleMonth);
        } catch (err) { }
    };
    const handleEditSchedule = async () => {
        try {
            await axios.put(`/schedules/${selectedSchedule.id}`, scheduleForm);
            setShowScheduleCrudModal(false);
            fetchEmployeeSchedules(scheduleEmployee._id, scheduleMonth);
        } catch (err) { }
    };
    const handleDeleteSchedule = async () => {
        try {
            await axios.delete(`/schedules/${selectedSchedule.id}`);
            setShowScheduleCrudModal(false);
            fetchEmployeeSchedules(scheduleEmployee._id, scheduleMonth);
        } catch (err) { }
    };


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
                                    <th>Tên nhân viên</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Số điện thoại</th>
                                    <th>Vai trò</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.length > 0 ? (
                                    employees.map(employee => (
                                        <tr key={employee._id}>
                                            <td style={{ cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }} onClick={() => handleShowSchedule(employee)}>{employee.full_name || '-'}</td>
                                            <td>{employee.username}</td>
                                            <td>{employee.email}</td>
                                            <td>{employee.phone || '-'}</td>
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
                                                    <button
                                                        className="btn btn-sm btn-warning"
                                                        onClick={() => handleToggleStatus(employee)}
                                                    >
                                                        {employee.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
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
                    roles={roles}
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

            {/* Schedule Modal */}
            {showScheduleModal && scheduleEmployee && (
                <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
                    <div className="modal-content" style={{ width: '100%', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h3>Lịch làm việc: {scheduleEmployee.full_name || scheduleEmployee.username}</h3>
                        <CalendarGrid
                            schedules={employeeSchedules}
                            onDayClick={handleScheduleDayClick}
                            currentMonth={scheduleMonth}
                            onMonthChange={handleScheduleMonthChange}
                        />
                        <div style={{ textAlign: 'right', marginTop: 12 }}>
                            <button onClick={() => setShowScheduleModal(false)}>Đóng</button>
                        </div>
                    </div>
                    {/* CRUD modal */}
                    {showScheduleCrudModal && (
                        <div className="modal-overlay" onClick={() => setShowScheduleCrudModal(false)}>
                            <div className="modal-content" onClick={e => e.stopPropagation()}>
                                <h3>{scheduleModalType === "add" ? "Thêm" : scheduleModalType === "edit" ? "Sửa" : "Xóa"} ca làm việc</h3>
                                <div style={{ margin: "20px 0" }}>
                                    {scheduleModalType === "delete" ? (
                                        <p>Bạn có chắc muốn xóa ca làm việc này?</p>
                                    ) : (
                                        <>
                                            <div>
                                                <label>Ngày: </label>
                                                <input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label>Ca: </label>
                                                <select value={scheduleForm.shift_type} onChange={e => setScheduleForm(f => ({ ...f, shift_type: e.target.value }))}>
                                                    <option value="morning">Sáng</option>
                                                    <option value="afternoon">Chiều</option>
                                                    <option value="night">Tối</option>
                                                    <option value="full_day">Cả ngày</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label>Bắt đầu: </label>
                                                <input type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm(f => ({ ...f, start_time: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label>Kết thúc: </label>
                                                <input type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm(f => ({ ...f, end_time: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label>Ghi chú: </label>
                                                <input type="text" value={scheduleForm.notes} onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))} />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="modal-actions">
                                    <button onClick={() => setShowScheduleCrudModal(false)}>Hủy</button>
                                    {scheduleModalType === "add" && <button onClick={handleAddSchedule}>Lưu</button>}
                                    {scheduleModalType === "edit" && <>
                                        <button onClick={handleEditSchedule}>Lưu</button>
                                        <button style={{ background: '#dc3545', color: '#fff' }} onClick={() => setScheduleModalType('delete')}>Xóa</button>
                                    </>}
                                    {scheduleModalType === "delete" && <button onClick={handleDeleteSchedule}>Xóa</button>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;
