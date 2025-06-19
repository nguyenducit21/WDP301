const express = require('express');
const router = express.Router();
const { getAllImportReceipts, createImportReceipt, getImportReceiptById } = require('../controllers/importReceipt.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Chỉ cho kitchen_staff, admin sử dụng
router.use(authMiddleware, roleMiddleware(['kitchen_staff', 'admin']));

router.get('/', getAllImportReceipts);            // Liệt kê phiếu nhập hàng
router.post('/create', createImportReceipt);      // Tạo mới phiếu nhập hàng
router.get('/:id', getImportReceiptById);         // Xem chi tiết phiếu nhập

module.exports = router;
