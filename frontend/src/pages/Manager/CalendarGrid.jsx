import React from "react";
import './CalendarGrid.css';

function getDaysInMonth(year, month) {
    const numDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: numDays }, (_, i) => new Date(year, month, i + 1));
}

function isSameDay(d1, d2) {
    return d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const CalendarGrid = ({ schedules, onDayClick, currentMonth, onMonthChange }) => {
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const days = getDaysInMonth(year, month);

    // Map ngày có lịch làm việc
    const scheduleDays = new Set(schedules.map(s => s.date)); // yyyy-mm-dd

    // Tìm thứ đầu tiên của tháng (0=CN, 1=T2...)
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = (firstDay === 0 ? 6 : firstDay - 1); // Để T2 là cột đầu

    // Tạo mảng lưới 6 hàng x 7 cột
    const grid = [];
    let dayIdx = 0;
    for (let row = 0; row < 6; row++) {
        const week = [];
        for (let col = 0; col < 7; col++) {
            const cellIdx = row * 7 + col;
            if (cellIdx < startOffset || dayIdx >= days.length) {
                week.push(null);
            } else {
                week.push(days[dayIdx]);
                dayIdx++;
            }
        }
        grid.push(week);
    }

    return (
        <div className="calendar-outer">
            <div className="calendar-nav">
                <button onClick={() => onMonthChange(-1)}>&larr; Tháng trước</button>
                <span className="calendar-title">
                    Tháng {month + 1} {year}
                </span>
                <button onClick={() => onMonthChange(1)}>Tháng sau &rarr;</button>
            </div>
            <div className="calendar-table">
                <div className="calendar-header-row">
                    {weekDays.map((d, i) => (
                        <div className="calendar-header-cell" key={i}>{d}</div>
                    ))}
                </div>
                {grid.map((week, i) => (
                    <div className="calendar-row" key={i}>
                        {week.map((date, j) => {
                            if (!date) return <div className="calendar-cell empty" key={j}></div>;
                            const dateStr = date.toISOString().split('T')[0];
                            const hasSchedule = scheduleDays.has(dateStr);
                            const isToday = isSameDay(date, today);
                            return (
                                <div
                                    className={`calendar-cell${hasSchedule ? ' has-schedule' : ''}${isToday ? ' today' : ''}`}
                                    key={j}
                                    onClick={() => onDayClick(date, hasSchedule)}
                                >
                                    <span>{date.getDate()}</span>
                                    {hasSchedule && <span className="dot"></span>}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="calendar-legend">
                <div className="legend-item">
                    <span className="dot red"></span> Có lịch làm việc
                </div>
                <div className="legend-item">
                    <span className="legend-today"></span> Hôm nay
                </div>
            </div>
        </div>
    );
};

export default CalendarGrid; 