const express = require('express');
const router = express.Router();
const {
    getTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable,
    updateTableStatus
} = require('../../controller/table.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

// roleMiddleware(['admin', 'manager', 'waiter'])
// Lấy tất cả bàn (có phân trang và filter)
router.get('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), getTables);

// Lấy chi tiết bàn
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), getTableById);

// Tạo bàn mới
router.post('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), createTable);

// Cập nhật thông tin bàn
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), updateTable);

// Cập nhật trạng thái bàn
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), updateTableStatus);

// Xóa bàn
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), deleteTable);

module.exports = router;
