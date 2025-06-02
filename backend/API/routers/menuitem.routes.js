const express = require('express');
const router = express.Router();
const menuItemController = require('../../controller/menuitem.controller');

// Tạo mới món ăn
router.post('/', menuItemController.create);

// Lấy tất cả món ăn
router.get('/', menuItemController.findAll);

// Lấy 1 món ăn theo id
router.get('/:id', menuItemController.findOne);

// Cập nhật món ăn
router.put('/:id', menuItemController.update);

// Xóa món ăn
router.delete('/:id', menuItemController.delete);

// Lấy các món ăn theo category_id (lọc danh mục)
router.get('/category/:categoryId', menuItemController.findByCategory);

// Lấy các món nổi bật (featured)
router.get('/featured/items', menuItemController.findFeatured);

module.exports = router;
