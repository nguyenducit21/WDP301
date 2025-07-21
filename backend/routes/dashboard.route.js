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
router.get('/waiter', authMiddleware, roleMiddleware(['waiter', 'admin']), dashboardController.waiterDashboard);
router.get('/kitchen-staff', authMiddleware, roleMiddleware(['kitchen_staff', 'admin']), dashboardController.kitchenStaffDashboard);
router.get('/staff-status', authMiddleware, roleMiddleware(['manager', 'admin']), dashboardController.getStaffStatus);
module.exports = router;
