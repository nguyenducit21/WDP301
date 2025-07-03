const express = require('express');
const router = express.Router();
const {
    getOrders,
    getOrderById,
    createOrder,
    updateOrder,
    updateOrderStatus,
    updateOrderPayment,
    cancelOrder,
    getChefOrders
} = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Lấy tất cả đơn hàng
router.get('/', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), getOrders);

// Lấy orders cho chef (pre-orders + staff orders)
router.get('/chef', authMiddleware, roleMiddleware(['kitchen_staff', 'admin']), getChefOrders);

// Lấy chi tiết đơn hàng
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), getOrderById);

// Tạo đơn hàng mới
router.post('/', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), createOrder);

// Cập nhật đơn hàng
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), updateOrder);

// Cập nhật trạng thái đơn hàng
router.put('/:id/status', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), updateOrderStatus);

// Cập nhật thanh toán
router.put('/:id/payment', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), updateOrderPayment);

// Hủy đơn hàng
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'staff', 'waiter']), cancelOrder);

module.exports = router;
