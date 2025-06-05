const express = require('express');
const router = express.Router();
const {
    getTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable,
    updateTableStatus
} = require('../controllers/table.controller');

// Lấy tất cả bàn
router.get('/', getTables);

// Lấy chi tiết bàn
router.get('/:id', getTableById);

// Tạo bàn mới
router.post('/', createTable);

// Cập nhật thông tin bàn
router.put('/:id', updateTable);

// Cập nhật trạng thái bàn
router.patch('/:id/status', updateTableStatus);

// Xóa bàn
router.delete('/:id', deleteTable);

module.exports = router;
