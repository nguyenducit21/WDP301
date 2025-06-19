// controller/dashboard.controller.js
const MenuItem = require('../models/menuItems.model');
const Category = require('../models/category.model');

const chefDashboard = async (req, res) => {
    try {
        // Tổng số món chưa ngừng kinh doanh
        const totalItems = await MenuItem.countDocuments({ is_deleted: false });

        // Số món ngừng kinh doanh
        const stoppedItems = await MenuItem.countDocuments({ is_deleted: true });

        // Số danh mục
        const totalCategories = await Category.countDocuments();

        // Có sẵn (chỉ món chưa ngừng kinh doanh)
        const available = await MenuItem.countDocuments({ is_deleted: false, is_available: true });
        // Hết hàng (chỉ món chưa ngừng kinh doanh)
        const outOfStock = await MenuItem.countDocuments({ is_deleted: false, is_available: false });

        // 5 món vừa thêm gần nhất (chưa ngừng KD)
        const recentItems = await MenuItem.find({ is_deleted: false })
            .sort({ created_at: -1 })
            .limit(5)
            .populate('category_id', 'name')
            .select('name category_id is_available image');

        res.json({
            totalItems,
            available,
            outOfStock,
            stoppedItems,
            totalCategories,
            recentItems,
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


module.exports = {
    chefDashboard
}