const express = require('express');
const router = express.Router();
const { getAllImportReceipts, createImportReceipt, getImportReceiptById } = require('../controllers/importReceipt.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

router.use(authMiddleware, roleMiddleware(['kitchen_staff', 'admin']));

router.get('/', getAllImportReceipts);            
router.post('/create', createImportReceipt);      
router.get('/:id', getImportReceiptById);         

module.exports = router;
