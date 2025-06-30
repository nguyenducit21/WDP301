const express = require('express');
const router = express.Router();
const {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    changeEmployeePassword
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

// Xóa nhân viên
router.delete('/:id', authMiddleware, resourcePermissionMiddleware('users', 'delete'), deleteEmployee);

// Đổi mật khẩu nhân viên
router.put('/:id/change-password', authMiddleware, resourcePermissionMiddleware('users', 'update'), changeEmployeePassword);

module.exports = router;
