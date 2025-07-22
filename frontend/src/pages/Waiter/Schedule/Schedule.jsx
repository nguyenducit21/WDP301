import React, { useState, useEffect, useContext } from 'react';
import axios from '../../../utils/axios.customize';
import { AuthContext } from '../../../context/AuthContext';
import { ToastContext } from '../../../context/StoreContext';
import './Schedule.css';

const Schedule = () => {
    const [scheduleData, setScheduleData] = useState({
        employee: null,
        schedules: []
    });
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const { user } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);

    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        fetchSchedule(year, month);
    }, [currentDate]);

    const fetchSchedule = async (year, month) => {
        try {
            setLoading(true);

            // Tạo startDate và endDate cho tháng được chọn
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

            const response = await axios.get(`/schedules/my-schedule?startDate=${startDate}&endDate=${endDate}`);

            if (response.data.success) {
                setScheduleData(response.data.data);
            } else {
                showToast('Lỗi khi tải lịch làm việc', 'error');
            }
        } catch (error) {
            console.error('Error fetching schedule:', error);
            showToast('Lỗi khi tải lịch làm việc', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return '#4caf50';
            case 'pending':
                return '#ff9800';
            case 'cancelled':
                return '#f44336';
            default:
                return '#757575';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'confirmed':
                return 'Đã xác nhận';
            case 'pending':
                return 'Chờ xác nhận';
            case 'cancelled':
                return 'Đã hủy';
            default:
                return status;
        }
    };

    const getShiftTypeText = (shiftType) => {
        switch (shiftType) {
            case 'morning':
                return 'Sáng';
            case 'afternoon':
                return 'Chiều';
            case 'night':
                return 'Tối';
            case 'full_day':
                return 'Cả ngày';
            default:
                return shiftType;
        }
    };

    const getRoleText = (role) => {
        switch (role) {
            case 'waiter':
                return '🥄 Phục vụ';
            case 'kitchen_staff':
                return '👨‍🍳 Nhân viên bếp';
            case 'manager':
                return '👔 Quản lý';
            case 'admin':
                return '⚙️ Quản trị viên';
            default:
                return '👤 Nhân viên';
        }
    };

    // Calendar helper functions
    const getMonthName = (date) => {
        const months = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];
        return months[date.getMonth()];
    };

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        const firstDay = new Date(year, month, 1).getDay();
        return firstDay === 0 ? 7 : firstDay; // Convert Sunday from 0 to 7
    };

    const getSchedulesForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return scheduleData.schedules.filter(schedule => schedule.date === dateStr);
    };

    const hasScheduleOnDate = (date) => {
        return getSchedulesForDate(date).length > 0;
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const handleDateClick = (date) => {
        const schedules = getSchedulesForDate(date);
        if (schedules.length > 0) {
            setSelectedDate({ date, schedules });
            setShowDetailModal(true);
        }
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const calendar = [];

        // Empty cells for days before the first day of month
        for (let i = 1; i < firstDay; i++) {
            calendar.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const hasSchedule = hasScheduleOnDate(date);
            const isToday = date.toDateString() === new Date().toDateString();

            calendar.push(
                <div
                    key={day}
                    className={`calendar-day ${hasSchedule ? 'has-schedule' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => handleDateClick(date)}
                >
                    <span className="day-number">{day}</span>
                    {hasSchedule && <div className="schedule-indicator"></div>}
                </div>
            );
        }

        return calendar;
    };

    // Group schedules by date
    const groupSchedulesByDate = () => {
        const grouped = {};
        scheduleData.schedules.forEach(schedule => {
            const date = schedule.date;
            if (!grouped[date]) {
                grouped[date] = {
                    day: schedule.day,
                    date: date,
                    shifts: []
                };
            }
            grouped[date].shifts.push(schedule);
        });

        // Sort shifts by start time
        Object.keys(grouped).forEach(date => {
            grouped[date].shifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        return grouped;
    };

    // Render grouped schedules
    const renderGroupedSchedules = () => {
        const groupedSchedules = groupSchedulesByDate();

        return Object.keys(groupedSchedules)
            .sort() // Sort by date
            .map(date => {
                const dayData = groupedSchedules[date];
                return (
                    <div key={date} className="schedule-day-group">
                        <div className="day-header">
                            <h3>{dayData.day}</h3>
                            <p className="day-date">{dayData.date}</p>
                            <span className="shift-count">{dayData.shifts.length} ca</span>
                        </div>
                        <div className="shifts-list">
                            {dayData.shifts.map((shift) => (
                                <div key={shift.id} className="shift-card">
                                    <div className="shift-info">
                                        <div className="shift-time">
                                            <p>🕐 {shift.startTime} - {shift.endTime}</p>
                                            <p className="shift-type">📋 {getShiftTypeText(shift.shiftType)}</p>
                                        </div>
                                        {shift.notes && (
                                            <div className="shift-notes">
                                                <p>📝 {shift.notes}</p>
                                            </div>
                                        )}
                                        <div
                                            className="shift-status"
                                            style={{ backgroundColor: getStatusColor(shift.status) }}
                                        >
                                            {getStatusText(shift.status)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            });
    };

    if (loading) {
        return (
            <div className="schedule-container">
                <div className="loading">Đang tải lịch làm việc...</div>
            </div>
        );
    }

    return (
        <div className="schedule-container">
            <div className="schedule-header">
                <div className="header-info">
                    <h2>📅 Lịch làm việc</h2>
                    {scheduleData.employee && (
                        <div className="employee-details">
                            <p className="employee-info">
                                👤 {scheduleData.employee.full_name} ({scheduleData.employee.username})
                            </p>
                            <p className="employee-role">
                                {getRoleText(scheduleData.employee.role)}
                            </p>
                        </div>
                    )}
                </div>
                <button onClick={() => {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth();
                    fetchSchedule(year, month);
                }} className="refresh-btn">
                    🔄 Làm mới
                </button>
            </div>

            {/* Calendar Navigation */}
            <div className="calendar-navigation">
                <button onClick={() => navigateMonth(-1)} className="nav-btn">
                    ← Tháng trước
                </button>
                <h3 className="current-month">
                    {getMonthName(currentDate)} {currentDate.getFullYear()}
                </h3>
                <button onClick={() => navigateMonth(1)} className="nav-btn">
                    Tháng sau →
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-container">
                <div className="calendar-header">
                    <div className="calendar-day-header">T2</div>
                    <div className="calendar-day-header">T3</div>
                    <div className="calendar-day-header">T4</div>
                    <div className="calendar-day-header">T5</div>
                    <div className="calendar-day-header">T6</div>
                    <div className="calendar-day-header">T7</div>
                    <div className="calendar-day-header">CN</div>
                </div>
                <div className="calendar-grid">
                    {renderCalendar()}
                </div>
            </div>

            {/* Legend */}
            <div className="calendar-legend">
                <div className="legend-item">
                    <div className="legend-color has-schedule"></div>
                    <span>Có lịch làm việc</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color today"></div>
                    <span>Hôm nay</span>
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedDate && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                Lịch làm việc ngày {selectedDate.date.getDate()}/{selectedDate.date.getMonth() + 1}/{selectedDate.date.getFullYear()}
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} className="close-btn">
                                ✕
                            </button>
                        </div>
                        <div className="modal-content">
                            {selectedDate.schedules.map((schedule) => (
                                <div key={schedule.id} className="schedule-detail-card">
                                    <div className="schedule-time">
                                        <span>🕐 {schedule.startTime} - {schedule.endTime}</span>
                                    </div>
                                    <div className="schedule-info">
                                        <span className="shift-type">📋 {getShiftTypeText(schedule.shiftType)}</span>
                                        <span
                                            className="schedule-status-badge"
                                            style={{ backgroundColor: getStatusColor(schedule.status) }}
                                        >
                                            {getStatusText(schedule.status)}
                                        </span>
                                    </div>
                                    {schedule.notes && (
                                        <div className="schedule-notes">
                                            <span>📝 {schedule.notes}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule; 