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
    moveReservation,
    getInvoiceData,
    confirmReservation,
    seatCustomer,
    completeReservation,
    updatePaymentStatus,
    checkoutTable
} = require('../controllers/reservation.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware')

// Lấy tất cả đặt bàn
router.get('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), getReservations);

// Lấy danh sách bàn có sẵn theo khu vực và thời gian
router.get('/available-tables', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), getAvailableTables);

// Lấy danh sách đặt bàn của khách hàng
router.get('/my-reservations', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), getCustomerReservations);

// Lấy chi tiết một đặt bàn
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), getReservationById);

// Tạo đặt bàn mới
router.post('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), createReservation);

// Cập nhật đặt bàn
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), updateReservation);

// Hủy đặt bàn
router.patch('/:id/cancel', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), cancelReservation);

// Chuyển bàn
router.patch('/:id/move', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), moveReservation);

router.get('/:reservationId/invoice', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), getInvoiceData);

router.patch('/:id/confirm', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), confirmReservation);

router.patch('/:id/seat', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), seatCustomer);

router.patch('/:id/complete', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), completeReservation);

router.patch('/:id/payment-status', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), updatePaymentStatus);

router.patch('/:id/checkout', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), checkoutTable)

module.exports = router;
