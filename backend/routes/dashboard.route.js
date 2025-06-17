// routes/dashboard.route.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.get('/chef', authMiddleware, roleMiddleware(['kitchen_staff', 'admin']), dashboardController.chefDashboard);

module.exports = router;
