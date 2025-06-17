// routes/inventory.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Import controller
const {
    getAllInventory,
    createInventory,
    updateInventory,
    importStock,
    getLowStockItems,
    deleteInventory
} = require('../controllers/inventory.controller');

// Middleware cho kitchen_staff
router.use(authMiddleware, roleMiddleware(['kitchen_staff', 'admin']));

// Routes
router.get('/', getAllInventory);
router.post('/', createInventory);
router.put('/:id', updateInventory);
router.post('/:id/import', importStock);
router.get('/low-stock', getLowStockItems);
router.delete('/:id', deleteInventory);

module.exports = router;
