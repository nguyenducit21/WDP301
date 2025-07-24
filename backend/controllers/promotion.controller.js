const Promotion = require('../models/promotion.model');

/**
 * Lấy tất cả khuyến mại, mới nhất trước
 */
const getAllPromotions = async (req, res) => {
    try {
        const { isClient, includeAll } = req.query;
        const now = new Date();
        
        // Xác định filter dựa trên tham số
        let filter = {};
        
        // Nếu không yêu cầu includeAll, áp dụng các filter thông thường
        if (includeAll !== 'true') {
            // Filter cơ bản: đang active và còn hạn
            filter = {
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            };
            
            // Nếu là client request, chỉ trả về các mã còn lượt dùng
            if (isClient === 'true') {
                filter.$or = [
                    { usageLimit: null },
                    { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
                ];
            }
        }
        
        // Lấy danh sách mã khuyến mại theo filter
        const promotions = await Promotion.find(filter).sort({ createdAt: -1 });
        
        // Thêm trường isExhausted để đánh dấu mã đã hết lượt dùng
        const processedPromotions = promotions.map(promo => {
            const promoObj = promo.toObject();
            promoObj.isExhausted = promo.usageLimit !== null && promo.usedCount >= promo.usageLimit;
            return promoObj;
        });
        
        return res.status(200).json({ 
            success: true, 
            data: processedPromotions
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lấy khuyến mại theo id
 */
const getPromotionById = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mại' });
        }
        return res.status(200).json({ success: true, data: promotion });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Tạo mới khuyến mại
 */
const createPromotion = async (req, res) => {
    try {
        const {
            code,
            type,
            value,
            minOrderValue,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            isActive,
            description
        } = req.body;

        // Kiểm tra mã đã tồn tại
        const existing = await Promotion.findOne({ code });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Mã khuyến mại đã tồn tại' });
        }

        const newPromo = new Promotion({
            code,
            type,
            value,
            minOrderValue,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            isActive,
            description
        });

        await newPromo.save();

        return res.status(201).json({ success: true, data: newPromo });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Cập nhật khuyến mại
 */
const updatePromotion = async (req, res) => {
    try {
        // Không cho phép cập nhật usedCount trực tiếp từ API
        const updateData = { ...req.body };
        delete updateData.usedCount;

        // Chỉ cho phép cập nhật các trường hợp lệ
        const allowedFields = [
            'code', 'type', 'value', 'minOrderValue', 'maxDiscount',
            'startDate', 'endDate', 'usageLimit', 'isActive', 'description'
        ];
        Object.keys(updateData).forEach(key => {
            if (!allowedFields.includes(key)) delete updateData[key];
        });

        const updatedPromo = await Promotion.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });

        if (!updatedPromo) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mại' });
        }

        return res.status(200).json({ success: true, data: updatedPromo });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Xóa khuyến mại
 */
const deletePromotion = async (req, res) => {
    try {
        const deletedPromo = await Promotion.findByIdAndDelete(req.params.id);
        if (!deletedPromo) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mại' });
        }
        return res.status(200).json({ success: true, message: 'Đã xóa khuyến mại' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Kiểm tra và áp dụng mã khuyến mại
 * Chỉ kiểm tra điều kiện, KHÔNG tăng usedCount ở đây
 */
const validateAndApplyPromotion = async (req, res) => {
    try {
        const { code, orderTotal, userId, isFirstOrder } = req.body;
        const now = new Date();

        const promotion = await Promotion.findOne({
            code,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        if (!promotion) {
            return res.status(404).json({ success: false, message: 'Mã khuyến mại không hợp lệ hoặc đã hết hạn' });
        }

        if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
            return res.status(400).json({ success: false, message: 'Mã khuyến mại đã hết lượt sử dụng' });
        }

        if (promotion.minOrderValue && Number(orderTotal) < Number(promotion.minOrderValue)) {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng phải từ ${promotion.minOrderValue}đ để áp dụng mã này`
            });
        }

        if (promotion.type === 'first_order' && !isFirstOrder) {
            return res.status(400).json({ success: false, message: 'Mã này chỉ áp dụng cho đơn đầu tiên' });
        }

        // Tính giảm giá
        let discount = 0;
        if (promotion.type === 'percent' || promotion.type === 'first_order') {
            discount = orderTotal * (promotion.value / 100);
            if (promotion.maxDiscount && discount > promotion.maxDiscount) {
                discount = promotion.maxDiscount;
            }
        } else if (promotion.type === 'fixed') {
            discount = promotion.value;
        }

        // KHÔNG tăng usedCount ở đây nữa
        // promotion.usedCount = (promotion.usedCount || 0) + 1;
        // await promotion.save();

        return res.status(200).json({ success: true, discount, promotion });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
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
