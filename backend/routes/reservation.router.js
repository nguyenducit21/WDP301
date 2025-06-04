const express = require('express');
const router = express.Router();
const {
    getReservations,
    getReservationById,
    createReservation,
    updateReservation,
    cancelReservation ,
    moveReservation
} = require('../../controller/reservation.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware')

// Lấy tất cả đặt bàn
router.get('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), getReservations);

// Lấy chi tiết đặt bàn
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), getReservationById);

// Tạo đặt bàn mới
router.post('/', authMiddleware, createReservation);
// router.post('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), createReservation);

// Cập nhật đặt bàn
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), updateReservation);

// Chuyển bàn
router.patch('/:id/move', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), moveReservation);

// Xóa đặt bàn
router.patch('/:id/cancel', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), cancelReservation );

module.exports = router;
