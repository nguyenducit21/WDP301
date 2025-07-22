const mongoose = require('mongoose');
const Schedule = require('../models/schedule.model');
const User = require('../models/user.model');
require('dotenv').config();

// Kết nối database
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const seedSchedules = async () => {
    try {
        // Tìm một số nhân viên để tạo lịch làm việc
        const employees = await User.find({
            role: { $in: ['waiter', 'kitchen_staff'] }
        }).limit(3);

        if (employees.length === 0) {
            console.log('Không tìm thấy nhân viên để tạo lịch làm việc');
            return;
        }

        // Xóa dữ liệu cũ
        await Schedule.deleteMany({});
        console.log('Đã xóa dữ liệu lịch làm việc cũ');

        const schedules = [];

        // Tạo lịch làm việc cho từng nhân viên
        for (const employee of employees) {
            // Tạo lịch làm việc cho 7 ngày tới
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);

                // Bỏ qua chủ nhật
                if (date.getDay() === 0) continue;

                const shiftTypes = ['morning', 'afternoon', 'night'];
                const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];

                let startTime, endTime;
                switch (shiftType) {
                    case 'morning':
                        startTime = '08:00';
                        endTime = '16:00';
                        break;
                    case 'afternoon':
                        startTime = '16:00';
                        endTime = '24:00';
                        break;
                    case 'night':
                        startTime = '00:00';
                        endTime = '08:00';
                        break;
                }

                const statuses = ['pending', 'confirmed'];
                const status = statuses[Math.floor(Math.random() * statuses.length)];

                schedules.push({
                    employee_id: employee._id,
                    date: date,
                    start_time: startTime,
                    end_time: endTime,
                    status: status,
                    shift_type: shiftType,
                    notes: i % 3 === 0 ? 'Ghi chú cho ca làm việc' : '',
                    created_at: new Date(),
                    updated_at: new Date()
                });
            }
        }

        // Lưu vào database
        await Schedule.insertMany(schedules);
        console.log(`Đã tạo ${schedules.length} lịch làm việc mẫu`);

        // Hiển thị thống kê
        const scheduleCount = await Schedule.countDocuments();
        console.log(`Tổng số lịch làm việc trong database: ${scheduleCount}`);

    } catch (error) {
        console.error('Lỗi khi tạo dữ liệu mẫu:', error);
    } finally {
        mongoose.connection.close();
        console.log('Đã đóng kết nối database');
    }
};

// Chạy script
seedSchedules(); 