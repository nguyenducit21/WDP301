const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

// Get all categories
router.get('/', categoryController.getAllCategories);

// Get single category
router.get('/:id', categoryController.getCategory);

module.exports = router;