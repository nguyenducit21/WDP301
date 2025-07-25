// routes/recipe.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Import controller
const {
    getRecipe,
    setRecipe,
    checkAvailability,
    getAllRecipes,
    getAvailableMenuItems,
    debugData,
    syncMenuItemAvailability
} = require('../controllers/menuItemRecipe.controller');

// Middleware cho kitchen_staff
router.use(authMiddleware, roleMiddleware(['kitchen_staff', 'admin', 'manager']));

// Routes
router.post('/sync-availability', syncMenuItemAvailability);
router.get('/all', getAllRecipes);
router.get('/debug', debugData);
router.get('/available-menu-items', getAvailableMenuItems);
router.get('/menu-items/:menuItemId', getRecipe);
router.post('/menu-items/:menuItemId', setRecipe);
router.get('/menu-items/:menuItemId/check', checkAvailability);

module.exports = router;
