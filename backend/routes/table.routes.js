const express = require('express');
const router = express.Router();
const {
    getTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable,
    updateTableStatus,
    cleaningCompleted
} = require('../controllers/table.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware')

// Lấy tất cả bàn
router.get('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), getTables);

// Lấy chi tiết bàn
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), getTableById);

// Tạo bàn mới
router.post('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), createTable);

// Cập nhật thông tin bàn
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), updateTable);

// Cập nhật trạng thái bàn
router.put('/:id/status', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), updateTableStatus);

// Xóa bàn
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), deleteTable);

router.patch('/:id/cleaning-completed', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), cleaningCompleted)

module.exports = router;
