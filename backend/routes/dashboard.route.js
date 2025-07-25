// routes/dashboard.route.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.get('/chef', authMiddleware, roleMiddleware(['kitchen_staff', 'admin']), dashboardController.chefDashboard);
router.get('/manager', authMiddleware, roleMiddleware(['manager', 'admin']), dashboardController.managerDashboard);
router.get('/recent-reservations', authMiddleware, roleMiddleware(['manager', 'admin']), dashboardController.getRecentReservations);
router.get('/admin', authMiddleware, roleMiddleware(['admin']), dashboardController.adminDashboard);
router.get('/kitchen-staff', authMiddleware, roleMiddleware(['kitchen_staff', 'admin']), dashboardController.kitchenStaffDashboard);
router.get('/staff-status', authMiddleware, roleMiddleware(['manager', 'admin']), dashboardController.getStaffStatus);
router.get('/waiter', authMiddleware, roleMiddleware(['waiter', 'admin', 'manager']), dashboardController.waiterDashboard);
router.get('/waiter/my-tables', authMiddleware, roleMiddleware(['waiter', 'admin', 'manager']), dashboardController.getWaiterTables);
router.get('/waiter/my-orders', authMiddleware, roleMiddleware(['waiter', 'admin', 'manager']), dashboardController.getWaiterOrders);
router.get('/waiter/notifications', authMiddleware, roleMiddleware(['waiter', 'admin', 'manager']), dashboardController.getWaiterNotifications);
router.get('/admin-stats', authMiddleware, roleMiddleware(['admin']), dashboardController.adminStats);
router.get('/admin-employee-performance', authMiddleware, roleMiddleware(['admin']), dashboardController.adminEmployeePerformance);
router.get('/admin-top-products', authMiddleware, roleMiddleware(['admin']), dashboardController.adminTopProducts);
router.get('/admin-promotion-stats', authMiddleware, roleMiddleware(['admin']), dashboardController.getPromotionStats);
router.get('/admin-busiest-slot', authMiddleware, roleMiddleware(['admin']), dashboardController.getBusiestBookingSlot);

// Thêm routes mới
router.get('/order-completion-stats', authMiddleware, roleMiddleware(['admin', 'manager']), dashboardController.getOrderCompletionStats);
router.get('/top-customers', authMiddleware, roleMiddleware(['admin', 'manager']), dashboardController.getTopCustomers);

module.exports = router;
