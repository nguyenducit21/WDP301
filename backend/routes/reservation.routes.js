const express = require('express');
const router = express.Router();
const {
    getAvailableTables,
    createReservation,
    getReservationById,
    updateReservation,
    cancelReservation,
    getCustomerReservations,
    getReservations,
    moveReservation
} = require('../controllers/reservation.controller');
const  authenticateToken  = require('../middlewares/auth.middleware');

// Lấy tất cả đặt bàn
router.get('/', getReservations);

// Lấy danh sách bàn có sẵn theo khu vực và thời gian
router.get('/available-tables', getAvailableTables);

// Lấy danh sách đặt bàn của khách hàng
router.get('/my-reservations', authenticateToken, getCustomerReservations);

// Lấy chi tiết một đặt bàn
router.get('/:id', authenticateToken, getReservationById);

// Tạo đặt bàn mới
router.post('/', authenticateToken, createReservation);

// Cập nhật đặt bàn
router.put('/:id', authenticateToken, updateReservation);

// Hủy đặt bàn
router.patch('/:id/cancel', authenticateToken, cancelReservation);

// Chuyển bàn
router.patch('/:id/move', moveReservation);

module.exports = router;
