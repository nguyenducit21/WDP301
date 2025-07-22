const express = require('express');
const router = express.Router();
const {
    getAllSchedules,
    getEmployeeSchedule,
    getMySchedule,
    createSchedule,
    updateSchedule,
    deleteSchedule
} = require('../controllers/schedule.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Lấy tất cả lịch làm việc (Admin/Manager)
router.get('/', 
    authMiddleware, 
    roleMiddleware(['admin', 'manager']), 
    getAllSchedules
);

// Lấy lịch làm việc của nhân viên theo ID (Admin/Manager)
router.get('/employee/:employeeId',
    authMiddleware,
    roleMiddleware(['admin', 'manager']),
    getEmployeeSchedule
);

// Lấy lịch làm việc của nhân viên hiện tại
router.get('/my-schedule',
    authMiddleware,
    roleMiddleware(['admin', 'manager', 'waiter', 'kitchen_staff']),
    getMySchedule
);

// Tạo lịch làm việc mới (Admin/Manager)
router.post('/',
    authMiddleware,
    roleMiddleware(['admin', 'manager']),
    createSchedule
);

// Cập nhật lịch làm việc (Admin/Manager)
router.put('/:id',
    authMiddleware,
    roleMiddleware(['admin', 'manager']),
    updateSchedule
);

// Xóa lịch làm việc (Admin/Manager)
router.delete('/:id',
    authMiddleware,
    roleMiddleware(['admin', 'manager']),
    deleteSchedule
);

module.exports = router; 