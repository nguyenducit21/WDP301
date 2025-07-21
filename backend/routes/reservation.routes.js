const express = require('express');
const router = express.Router();
const {
    getAvailableTables,
    createReservation,
    getReservationById,
    updateReservation,
    cancelReservation,
    getCustomerReservations,
    getCustomerReservationsByUserId,
    getReservations,
    moveReservation,
    getInvoiceData,
    confirmReservation,
    seatCustomer,
    completeReservation,
    updatePaymentStatus,
    checkoutTable,
    autoCancelExpiredReservations,
    getChefOrders,
    updateReservationStatus,
    assignStaffToReservation
} = require('../controllers/reservation.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware')

// Lấy tất cả đặt bàn
router.get('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer', 'kitchen_staff']), getReservations);

router.get('/orders', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer', 'kitchen_staff']), getChefOrders);

// Lấy danh sách bàn có sẵn theo khu vực và thời gian
router.get('/available-tables', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer', 'kitchen_staff']), getAvailableTables);

// Tự động hủy các đặt bàn hết hạn (có thể gọi thủ công)
router.post('/auto-cancel-expired', authMiddleware, roleMiddleware(['admin', 'manager']), autoCancelExpiredReservations);

// Lấy danh sách đặt bàn của khách hàng
router.get('/my-reservations', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer', 'kitchen_staff']), getCustomerReservationsByUserId);

// Lấy danh sách đặt bàn của khách hàng
router.get('/my-reservations/:userId', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer', 'kitchen_staff']), getCustomerReservations);

// Lấy chi tiết một đặt bàn
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer', 'kitchen_staff']), getReservationById);

// Tạo đặt bàn mới
router.post('/', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer', 'kitchen_staff']), createReservation);

// Cập nhật đặt bàn
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer', 'kitchen_staff']), updateReservation);

// Hủy đặt bàn
router.patch('/:id/cancel', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer', 'kitchen_staff']), cancelReservation);

// Chuyển bàn
router.patch('/:id/move', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'customer']), moveReservation);

router.get('/:reservationId/invoice', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), getInvoiceData);

router.patch('/:id/confirm', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), confirmReservation);

router.patch('/:id/seat', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), seatCustomer);

router.patch('/:id/complete', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), completeReservation);

router.patch('/:id/payment-status', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), updatePaymentStatus);

router.patch('/:id/checkout', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), checkoutTable)
router.put('/confirm/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), confirmReservation);
// Cập nhật status đặt bàn (dành cho chef)
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter', 'kitchen_staff']), updateReservationStatus);
router.put('/assign-staff/:reservationId', authMiddleware, roleMiddleware(['admin', 'manager', 'waiter']), assignStaffToReservation);

module.exports = router;
