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
const { resourcePermissionMiddleware } = require('../middlewares/permission.middleware');

// Lấy danh sách tất cả nhân viên
router.get('/', authMiddleware, resourcePermissionMiddleware('users', 'read'), getAllEmployees);

// Lấy thông tin chi tiết một nhân viên
router.get('/:id', authMiddleware, resourcePermissionMiddleware('users', 'read'), getEmployeeById);

// Tạo nhân viên mới
router.post('/', authMiddleware, resourcePermissionMiddleware('users', 'create'), createEmployee);

// Cập nhật thông tin nhân viên
router.put('/:id', authMiddleware, resourcePermissionMiddleware('users', 'update'), updateEmployee);

// Toggle trạng thái nhân viên (active/inactive)
router.patch('/:id/toggle-status', authMiddleware, resourcePermissionMiddleware('users', 'update'), toggleEmployeeStatus);

module.exports = router;
