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
    getInventoryHistory,
    getDailyIngredientConsumption
} = require('../controllers/inventory.controller');
const { getInventoryAnalytics } = require('../controllers/inventoryAnalytics.controller');

// Middleware cho kitchen_staff
router.use(authMiddleware, roleMiddleware(['kitchen_staff', 'admin', 'manager']));

// ---- ĐẶT CÁC ROUTE ĐẶC BIỆT (KHÔNG CÓ ID) Ở TRÊN ----
router.get('/analytics', getInventoryAnalytics);
router.get('/low-stock', getLowStockItems);
router.get('/consumption', getDailyIngredientConsumption);

// ---- CÁC ROUTE CÓ ID, LUÔN ĐẶT SAU ----
router.get('/', getAllInventory);
router.get('/:id/history', getInventoryHistory);
router.get('/:id', getInventoryById);           
router.post('/', createInventory);
router.put('/:id', updateInventory);
router.patch('/:id/stock-check', stockCheck);
router.post('/:id/import', importStock);
router.delete('/:id', deleteInventory);

module.exports = router;
