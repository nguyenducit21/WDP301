import React, { useState, useEffect } from "react";
import axios from "../../utils/axios.customize";
import CalendarGrid from "./CalendarGrid";
import "./CalendarGrid.css";

const ScheduleManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("add"); // add | edit | delete
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [form, setForm] = useState({ employee_id: "", date: "", shift_type: "morning", start_time: "08:00", end_time: "16:00", notes: "" });
    const [loading, setLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // Lấy danh sách nhân viên
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await axios.get("/employees?limit=100");
                if (res.data.success) {
                    setEmployees(res.data.data);
                }
            } catch (err) {
                setEmployees([]);
            }
        };
        fetchEmployees();
    }, []);

    // Lấy lịch làm việc của nhân viên theo tháng
    const fetchEmployeeSchedules = async (employeeId, monthDate) => {
        setLoading(true);
        try {
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const res = await axios.get(`/schedules/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`);
            if (res.data.success) {
                setSchedules(res.data.data.schedules || []);
            }
        } catch (err) {
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    };

    // Khi chọn nhân viên hoặc đổi tháng
    useEffect(() => {
        if (selectedEmployee) {
            fetchEmployeeSchedules(selectedEmployee._id, currentMonth);
        }
    }, [selectedEmployee, currentMonth]);

    // CRUD
    const handleAdd = async () => {
        try {
            await axios.post("/schedules", form);
            setShowModal(false);
            fetchEmployeeSchedules(selectedEmployee._id, currentMonth);
        } catch (err) { }
    };
    const handleEdit = async () => {
        try {
            await axios.put(`/schedules/${selectedSchedule.id}`, form);
            setShowModal(false);
            fetchEmployeeSchedules(selectedEmployee._id, currentMonth);
        } catch (err) { }
    };
    const handleDelete = async () => {
        try {
            await axios.delete(`/schedules/${selectedSchedule.id}`);
            setShowModal(false);
            fetchEmployeeSchedules(selectedEmployee._id, currentMonth);
        } catch (err) { }
    };

    // Khi mở modal sửa, điền dữ liệu vào form
    useEffect(() => {
        if (modalType === "edit" && selectedSchedule) {
            setForm({
                employee_id: selectedEmployee?._id || "",
                date: selectedSchedule.date,
                shift_type: selectedSchedule.shiftType || "morning",
                start_time: selectedSchedule.startTime || "08:00",
                end_time: selectedSchedule.endTime || "16:00",
                notes: selectedSchedule.notes || ""
            });
        } else if (modalType === "add") {
            setForm({ employee_id: selectedEmployee?._id || "", date: "", shift_type: "morning", start_time: "08:00", end_time: "16:00", notes: "" });
        }
    }, [modalType, selectedSchedule, selectedEmployee]);

    // Xử lý click ngày trên calendar
    const handleDayClick = (date, hasSchedule) => {
        if (!selectedEmployee) return;
        const dateStr = date.toISOString().split('T')[0];
        const sch = schedules.find(s => s.date === dateStr);
        if (sch) {
            setSelectedSchedule(sch);
            setModalType("edit");
            setShowModal(true);
        } else {
            setForm({
                employee_id: selectedEmployee._id,
                date: dateStr,
                shift_type: "morning",
                start_time: "08:00",
                end_time: "16:00",
                notes: ""
            });
            setModalType("add");
            setShowModal(true);
        }
    };

    // Điều hướng tháng
    const handleMonthChange = (delta) => {
        setCurrentMonth(prev => {
            const y = prev.getFullYear();
            const m = prev.getMonth() + delta;
            return new Date(y, m, 1);
        });
    };

    return (
        <div className="schedule-management-container">
            <h2>Quản lý lịch làm việc nhân viên</h2>
            {!selectedEmployee ? (
                <div className="employee-list">
                    <h3>Chọn nhân viên để xem lịch làm việc</h3>
                    <ul>
                        {employees.map(emp => (
                            <li key={emp._id} onClick={() => setSelectedEmployee(emp)} style={{ cursor: 'pointer', padding: 8, borderBottom: '1px solid #eee' }}>
                                <b>{emp.full_name || emp.username}</b> <span style={{ color: '#888' }}>({emp.role_id?.name})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <>
                    <button onClick={() => { setSelectedEmployee(null); setSchedules([]); setSelectedSchedule(null); }} style={{ marginBottom: 16 }}>← Quay lại danh sách nhân viên</button>
                    <h3>Lịch làm việc của: {selectedEmployee.full_name || selectedEmployee.username}</h3>
                    <div style={{ marginBottom: 16 }}>
                        <CalendarGrid
                            schedules={schedules}
                            onDayClick={handleDayClick}
                            currentMonth={currentMonth}
                            onMonthChange={handleMonthChange}
                        />
                    </div>
                </>
            )}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{modalType === "add" ? "Thêm" : modalType === "edit" ? "Sửa" : "Xóa"} ca làm việc</h3>
                        <div style={{ margin: "20px 0" }}>
                            {modalType === "delete" ? (
                                <p>Bạn có chắc muốn xóa ca làm việc này?</p>
                            ) : (
                                <>
                                    <div>
                                        <label>Ngày: </label>
                                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label>Ca: </label>
                                        <select value={form.shift_type} onChange={e => setForm(f => ({ ...f, shift_type: e.target.value }))}>
                                            <option value="morning">Sáng</option>
                                            <option value="afternoon">Chiều</option>
                                            <option value="night">Tối</option>
                                            <option value="full_day">Cả ngày</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Bắt đầu: </label>
                                        <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label>Kết thúc: </label>
                                        <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label>Ghi chú: </label>
                                        <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowModal(false)}>Hủy</button>
                            {modalType === "add" && <button onClick={handleAdd}>Lưu</button>}
                            {modalType === "edit" && <button onClick={handleEdit}>Lưu</button>}
                            {modalType === "delete" && <button onClick={handleDelete}>Xóa</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleManagement; 