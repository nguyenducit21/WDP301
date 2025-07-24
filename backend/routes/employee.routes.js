const express = require('express');
const router = express.Router();
const {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    toggleEmployeeStatus
} = require('../controllers/employee.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Lấy danh sách tất cả nhân viên
router.get('/', authMiddleware, roleMiddleware(['admin', 'manager']), getAllEmployees);

// Lấy thông tin chi tiết một nhân viên
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'manager']), getEmployeeById);

// Tạo nhân viên mới
router.post('/', authMiddleware, roleMiddleware(['admin', 'manager']), createEmployee);

// Cập nhật thông tin nhân viên
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'manager']), updateEmployee);

// Toggle trạng thái nhân viên (active/inactive)
router.patch('/:id/toggle-status', authMiddleware, roleMiddleware(['admin', 'manager']), toggleEmployeeStatus);

module.exports = router;
