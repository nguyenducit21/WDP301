const express = require('express');
const router = express.Router();
const menuItemController = require('../../controller/menuitem.controller');

router.post('/', menuItemController.create);
router.get('/', menuItemController.findAll);
router.get('/deleted', menuItemController.findDeleted); // Route lấy món ăn đã xóa mềm
router.get('/:id', menuItemController.findOne);
router.put('/:id', menuItemController.update);
router.delete('/:id', menuItemController.delete);
router.post('/delete-many', menuItemController.deleteMany); // Route xóa nhiều món ăn
router.put('/:id/restore', menuItemController.restore); // Route khôi phục món ăn
router.get('/category/:categoryId', menuItemController.findByCategory);
router.get('/featured/items', menuItemController.findFeatured);

module.exports = router;