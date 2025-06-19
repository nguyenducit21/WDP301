const express = require('express');
const router = express.Router();
const {
    getBookingSlots,
    getBookingSlotById,
    createBookingSlot,
    updateBookingSlot,
    deleteBookingSlot
} = require('../controllers/bookingSlot.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Lấy tất cả booking slots
router.get('/', getBookingSlots);

// Lấy chi tiết booking slot
router.get('/:id', getBookingSlotById);

// Tạo booking slot mới - chỉ admin/manager
router.post('/', authMiddleware, roleMiddleware(['admin', 'manager']), createBookingSlot);

// Cập nhật booking slot - chỉ admin/manager
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'manager']), updateBookingSlot);

// Xóa booking slot - chỉ admin
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteBookingSlot);

module.exports = router; 