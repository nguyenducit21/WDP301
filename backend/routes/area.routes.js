const express = require('express');
const router = express.Router();
const {
    getAreas,
    getAreaById,
    createArea,
    updateArea,
    deleteArea
} = require('../controllers/area.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Lấy tất cả khu vực
router.get('/', authMiddleware, getAreas);

// Lấy chi tiết khu vực
router.get('/:id', authMiddleware,  getAreaById);

// Tạo khu vực mới
router.post('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), createArea);

// Cập nhật khu vực
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), updateArea);

// Xóa khu vực
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), deleteArea);

module.exports = router;
