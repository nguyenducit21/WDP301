const Schedule = require('../models/schedule.model');
const User = require('../models/user.model');

// Lấy tất cả lịch làm việc (cho Admin/Manager)
const getAllSchedules = async (req, res) => {
    try {
        const { startDate, endDate, status, role, page = 1, limit = 50 } = req.query;

        // Xây dựng filter cho schedules
        let scheduleFilter = {};

        // Filter theo khoảng thời gian
        if (startDate && endDate) {
            scheduleFilter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (startDate) {
            scheduleFilter.date = { $gte: new Date(startDate) };
        } else if (endDate) {
            scheduleFilter.date = { $lte: new Date(endDate) };
        }

        // Filter theo status
        if (status) {
            scheduleFilter.status = status;
        }

        // Lấy lịch làm việc với populate employee
        let query = Schedule.find(scheduleFilter)
            .populate({
                path: 'employee_id',
                select: 'full_name username email role',
                match: role ? { role: role } : {} // Filter theo role nếu có
            })
            .sort({ date: 1, start_time: 1 });

        // Pagination
        const skip = (page - 1) * limit;
        const schedules = await query.skip(skip).limit(parseInt(limit));

        // Lọc bỏ schedules có employee_id null (do filter role)
        const filteredSchedules = schedules.filter(schedule => schedule.employee_id !== null);

        // Group theo employee
        const groupedByEmployee = {};
        filteredSchedules.forEach(schedule => {
            const employeeId = schedule.employee_id._id.toString();
            if (!groupedByEmployee[employeeId]) {
                groupedByEmployee[employeeId] = {
                    employee: {
                        id: schedule.employee_id._id,
                        full_name: schedule.employee_id.full_name,
                        username: schedule.employee_id.username,
                        email: schedule.employee_id.email,
                        role: schedule.employee_id.role
                    },
                    schedules: []
                };
            }

            groupedByEmployee[employeeId].schedules.push({
                id: schedule._id,
                day: getDayOfWeek(schedule.date),
                date: schedule.date.toISOString().split('T')[0],
                startTime: schedule.start_time,
                endTime: schedule.end_time,
                status: schedule.status,
                shiftType: schedule.shift_type,
                notes: schedule.notes,
                created_at: schedule.created_at
            });
        });

        // Tính tổng số
        const total = await Schedule.countDocuments(scheduleFilter);

        res.status(200).json({
            success: true,
            data: {
                employees: Object.values(groupedByEmployee),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalSchedules: total,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Error getting all schedules:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách lịch làm việc',
            error: error.message
        });
    }
};

// Lấy lịch làm việc của nhân viên theo ID
const getEmployeeSchedule = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate, status } = req.query;

        // Kiểm tra employee có tồn tại không
        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }

        // Xây dựng filter
        let filter = { employee_id: employeeId };

        // Filter theo khoảng thời gian
        if (startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (startDate) {
            filter.date = { $gte: new Date(startDate) };
        } else if (endDate) {
            filter.date = { $lte: new Date(endDate) };
        }

        // Filter theo status
        if (status) {
            filter.status = status;
        }

        // Lấy lịch làm việc
        const schedules = await Schedule.find(filter)
            .populate('employee_id', 'full_name username email')
            .sort({ date: 1, start_time: 1 });

        // Format dữ liệu trả về
        const formattedSchedules = schedules.map(schedule => ({
            id: schedule._id,
            day: getDayOfWeek(schedule.date),
            date: schedule.date.toISOString().split('T')[0],
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            status: schedule.status,
            shiftType: schedule.shift_type,
            notes: schedule.notes,
            created_at: schedule.created_at
        }));

        res.status(200).json({
            success: true,
            data: {
                employee: {
                    id: employee._id,
                    full_name: employee.full_name,
                    username: employee.username,
                    email: employee.email
                },
                schedules: formattedSchedules
            }
        });
    } catch (error) {
        console.error('Error getting employee schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch làm việc',
            error: error.message
        });
    }
};

// Lấy lịch làm việc của nhân viên hiện tại (dựa trên token)
const getMySchedule = async (req, res) => {
    try {
        const employeeId = req.user.userId;
        const { startDate, endDate, status } = req.query;

        // Lấy thông tin nhân viên từ database
        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin nhân viên'
            });
        }

        // Xây dựng filter
        let filter = { employee_id: employeeId };

        // Filter theo khoảng thời gian
        if (startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (startDate) {
            filter.date = { $gte: new Date(startDate) };
        } else if (endDate) {
            filter.date = { $lte: new Date(endDate) };
        }

        // Filter theo status
        if (status) {
            filter.status = status;
        }

        // Lấy lịch làm việc
        const schedules = await Schedule.find(filter)
            .populate('employee_id', 'full_name username email role_id')
            .sort({ date: 1, start_time: 1 });

        // Format dữ liệu trả về
        const formattedSchedules = schedules.map(schedule => ({
            id: schedule._id,
            day: getDayOfWeek(schedule.date),
            date: schedule.date.toISOString().split('T')[0],
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            status: schedule.status,
            shiftType: schedule.shift_type,
            notes: schedule.notes,
            created_at: schedule.created_at
        }));

        res.status(200).json({
            success: true,
            data: {
                employee: {
                    id: employee._id,
                    full_name: employee.full_name || 'N/A',
                    username: employee.username || 'N/A',
                    email: employee.email || 'N/A',
                    role: employee.role || 'N/A'
                },
                schedules: formattedSchedules
            }
        });
    } catch (error) {
        console.error('Error getting my schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch làm việc',
            error: error.message
        });
    }
};

// Tạo lịch làm việc mới
const createSchedule = async (req, res) => {
    try {
        const {
            employee_id,
            date,
            start_time,
            end_time,
            shift_type,
            notes
        } = req.body;

        // Validation
        if (!employee_id || !date || !start_time || !end_time || !shift_type) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        // Kiểm tra employee có tồn tại không
        const employee = await User.findById(employee_id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }

        // Kiểm tra xem có trùng thời gian làm việc không
        const existingSchedules = await Schedule.find({
            employee_id,
            date: new Date(date)
        });

        // Kiểm tra xung đột thời gian
        const newStartTime = new Date(`1970-01-01T${start_time}:00`);
        const newEndTime = new Date(`1970-01-01T${end_time}:00`);

        for (const schedule of existingSchedules) {
            const existingStartTime = new Date(`1970-01-01T${schedule.start_time}:00`);
            const existingEndTime = new Date(`1970-01-01T${schedule.end_time}:00`);

            // Kiểm tra xung đột thời gian
            if (
                (newStartTime < existingEndTime && newEndTime > existingStartTime)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Thời gian làm việc bị trùng với ca làm việc khác'
                });
            }
        }

        // Tạo lịch làm việc mới
        const schedule = new Schedule({
            employee_id,
            date: new Date(date),
            start_time,
            end_time,
            shift_type,
            notes: notes || ''
        });

        await schedule.save();

        // Populate employee info
        await schedule.populate('employee_id', 'full_name username email');

        res.status(201).json({
            success: true,
            message: 'Tạo lịch làm việc thành công',
            data: schedule
        });
    } catch (error) {
        console.error('Error creating schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo lịch làm việc',
            error: error.message
        });
    }
};

// Cập nhật lịch làm việc
const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const schedule = await Schedule.findById(id);
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch làm việc'
            });
        }

        // Cập nhật thời gian
        updateData.updated_at = new Date();

        const updatedSchedule = await Schedule.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('employee_id', 'full_name username email');

        res.status(200).json({
            success: true,
            message: 'Cập nhật lịch làm việc thành công',
            data: updatedSchedule
        });
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật lịch làm việc',
            error: error.message
        });
    }
};

// Xóa lịch làm việc
const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findById(id);
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch làm việc'
            });
        }

        await Schedule.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Xóa lịch làm việc thành công'
        });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa lịch làm việc',
            error: error.message
        });
    }
};

// Helper function để lấy tên ngày trong tuần
const getDayOfWeek = (date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[date.getDay()];
};

module.exports = {
    getAllSchedules,
    getEmployeeSchedule,
    getMySchedule,
    createSchedule,
    updateSchedule,
    deleteSchedule
}; 