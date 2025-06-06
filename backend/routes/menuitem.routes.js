const express = require('express');
const router = express.Router();
const menuItemController = require('../controllers/menuitem.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// ROUTE PUBLIC (cho KH xem)
router.get('/', menuItemController.findAll); // Menu cho khách
router.get('/category/:categoryId', menuItemController.findByCategory);
router.get('/featured/items', menuItemController.findFeatured);

// ROUTE CẦN ĐĂNG NHẬP & PHÂN QUYỀN (dành cho chef/quản trị viên)
router.post('/', authMiddleware, roleMiddleware(['chef']), menuItemController.create);
router.get('/deleted', authMiddleware, roleMiddleware(['chef']), menuItemController.findDeleted);
router.get('/:id', authMiddleware, roleMiddleware(['chef']), menuItemController.findOne);
router.put('/:id', authMiddleware, roleMiddleware(['chef']), menuItemController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['chef']), menuItemController.delete);
router.post('/delete-many', authMiddleware, roleMiddleware(['chef']), menuItemController.deleteMany);
router.put('/:id/restore', authMiddleware, roleMiddleware(['chef']), menuItemController.restore);


module.exports = router;