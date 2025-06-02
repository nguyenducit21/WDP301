const express = require('express');
const router = express.Router();
const tableController = require('../controllers/table.controller');

// Get all tables
router.get('/', tableController.getAllTables);

// Get tables by area
router.get('/area/:areaId', tableController.getTablesByArea);

// Get table by ID
router.get('/:id', tableController.getTable);

// Update table status
router.patch('/:id/status', tableController.updateTableStatus);

module.exports = router;