const Promotion = require('../models/promotion.model');

// Lấy tất cả khuyến mại
const getAllPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: promotions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy khuyến mại theo ID
const getPromotionById = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mại' });
        res.status(200).json({ success: true, data: promotion });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Tạo khuyến mại mới
const createPromotion = async (req, res) => {
    try {
        const { code, type, value, minOrderValue, maxDiscount, startDate, endDate, usageLimit, isActive } = req.body;
        const existing = await Promotion.findOne({ code });
        if (existing) return res.status(400).json({ success: false, message: 'Mã khuyến mại đã tồn tại' });
        const promotion = new Promotion({ code, type, value, minOrderValue, maxDiscount, startDate, endDate, usageLimit, isActive });
        await promotion.save();
        res.status(201).json({ success: true, data: promotion });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Cập nhật khuyến mại
const updatePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!promotion) return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mại' });
        res.status(200).json({ success: true, data: promotion });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Xóa khuyến mại
const deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndDelete(req.params.id);
        if (!promotion) return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mại' });
        res.status(200).json({ success: true, message: 'Đã xóa khuyến mại' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Kiểm tra và áp dụng mã khuyến mại
const validateAndApplyPromotion = async (req, res) => {
    try {
        const { code, orderTotal, userId, isFirstOrder } = req.body;
        const now = new Date();
        const promotion = await Promotion.findOne({ code, isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });
        if (!promotion) return res.status(404).json({ success: false, message: 'Mã khuyến mại không hợp lệ hoặc đã hết hạn' });
        if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
            return res.status(400).json({ success: false, message: 'Mã khuyến mại đã hết lượt sử dụng' });
        }
        if (promotion.minOrderValue && orderTotal < promotion.minOrderValue) {
            return res.status(400).json({ success: false, message: `Đơn hàng phải từ ${promotion.minOrderValue}đ để áp dụng mã này` });
        }
        if (promotion.type === 'first_order' && !isFirstOrder) {
            return res.status(400).json({ success: false, message: 'Mã này chỉ áp dụng cho đơn đầu tiên' });
        }
        let discount = 0;
        if (promotion.type === 'percent') {
            discount = orderTotal * (promotion.value / 100);
            if (promotion.maxDiscount && discount > promotion.maxDiscount) {
                discount = promotion.maxDiscount;
            }
        } else if (promotion.type === 'fixed') {
            discount = promotion.value;
        } else if (promotion.type === 'first_order') {
            discount = orderTotal * (promotion.value / 100);
            if (promotion.maxDiscount && discount > promotion.maxDiscount) {
                discount = promotion.maxDiscount;
            }
        }
        res.status(200).json({ success: true, discount, promotion });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllPromotions,
    getPromotionById,
    createPromotion,
    updatePromotion,
    deletePromotion,
    validateAndApplyPromotion
}; 