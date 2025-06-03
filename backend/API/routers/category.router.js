const express = require('express');
const router = express.Router();
const categoryController = require('../../controller/category.controller');

router.get('/', categoryController.findAll);
router.delete('/:id', categoryController.delete); // Thêm route DELETE
router.put('/:id', categoryController.update); // Thêm route PUT

module.exports = router;