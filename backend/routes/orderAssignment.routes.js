const express = require('express');
const router = express.Router();
const {
    getPendingOrders,
    claimOrder,
    releaseOrder,
    completeOrder,
    getEmployeeStats
} = require('../controllers/orderAssignment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Lấy danh sách orders đang chờ assignment
router.get('/pending',
    authMiddleware,
    roleMiddleware(['admin', 'manager', 'waiter', 'kitchen_staff']),
    getPendingOrders
);

// Nhận đơn hàng
router.post('/:assignmentId/claim',
    authMiddleware,
    roleMiddleware(['admin', 'manager', 'waiter', 'kitchen_staff']),
    claimOrder
);

// Trả lại đơn hàng
router.post('/:assignmentId/release',
    authMiddleware,
    roleMiddleware(['admin', 'manager', 'waiter', 'kitchen_staff']),
    releaseOrder
);

// Hoàn thành đơn hàng
router.post('/:assignmentId/complete',
    authMiddleware,
    roleMiddleware(['admin', 'manager', 'waiter', 'kitchen_staff']),
    completeOrder
);

// Lấy thống kê hiệu suất nhân viên
router.get('/stats',
    authMiddleware,
    roleMiddleware(['admin', 'manager', 'waiter', 'kitchen_staff']),
    getEmployeeStats
);

module.exports = router; 