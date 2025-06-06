const express = require('express');
const router = express.Router();
const menuItemController = require('../../controller/menuitem.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

router.post('/', authMiddleware, roleMiddleware(['chef']), menuItemController.create);
router.get('/', menuItemController.findAll);
router.get('/deleted', authMiddleware, roleMiddleware(['chef']), menuItemController.findDeleted); // Route lấy món ăn đã xóa mềm
router.get('/:id', authMiddleware, roleMiddleware(['chef']), menuItemController.findOne);
router.put('/:id', authMiddleware, roleMiddleware(['chef']), menuItemController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['chef']), menuItemController.delete);
router.post('/delete-many', authMiddleware, roleMiddleware(['chef']), menuItemController.deleteMany); // Route xóa nhiều món ăn
router.put('/:id/restore', authMiddleware, roleMiddleware(['chef']), menuItemController.restore); // Route khôi phục món ăn
router.get('/category/:categoryId', authMiddleware, roleMiddleware(['chef']), menuItemController.findByCategory);
router.get('/featured/items', authMiddleware, roleMiddleware(['chef']), menuItemController.findFeatured);

module.exports = router;