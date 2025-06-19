// routes/inventory.routes.js - SỬA THỨ TỰ ROUTE
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const {
    getAllInventory,
    getInventoryById,
    createInventory,
    updateInventory,
    stockCheck,
    importStock,
    getLowStockItems,
    deleteInventory,
    getInventoryHistory
} = require('../controllers/inventory.controller');

// Middleware cho kitchen_staff
router.use(authMiddleware, roleMiddleware(['kitchen_staff', 'admin'])); 


router.get('/', getAllInventory);
router.get('/low-stock', getLowStockItems);
router.get('/:id/history', getInventoryHistory); 
router.get('/:id', getInventoryById);           
router.post('/', createInventory);
router.put('/:id', updateInventory);
router.patch('/:id/stock-check', stockCheck);
router.post('/:id/import', importStock);
router.delete('/:id', deleteInventory);

module.exports = router;
