const MenuItem = require('../models/menuItem.model');

// Get all menu items
exports.getAllMenuItems = async (req, res) => {
    try {
        const menuItems = await MenuItem.find()
            .populate('category_id', 'name')
            .sort({ created_at: -1 });
        res.json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get menu items by category
exports.getMenuItemsByCategory = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ category_id: req.params.categoryId })
            .populate('category_id', 'name')
            .sort({ created_at: -1 });
        res.json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single menu item
exports.getMenuItem = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
            .populate('category_id', 'name');
        if (!menuItem) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn' });
        }
        res.json(menuItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};