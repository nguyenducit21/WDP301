// routes/recipe.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Import controller
const {
    getRecipe,
    setRecipe,
    checkAvailability
} = require('../controllers/menuItemRecipe.controller');

// Middleware cho kitchen_staff
router.use(authMiddleware, roleMiddleware(['kitchen_staff', 'admin']));

// Routes
router.get('/menu-items/:menuItemId', getRecipe);
router.post('/menu-items/:menuItemId', setRecipe);
router.get('/menu-items/:menuItemId/check', checkAvailability);

module.exports = router;
