const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controller');

// CRUD
router.get('/', promotionController.getAllPromotions);
router.get('/:id', promotionController.getPromotionById);
router.post('/', promotionController.createPromotion);
router.put('/:id', promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);

// Kiểm tra và áp dụng mã khuyến mại
router.post('/validate', promotionController.validateAndApplyPromotion);

module.exports = router; 