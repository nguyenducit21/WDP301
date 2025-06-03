const MenuItem = require('../models/menuItem.model');

// Tạo mới menu item
exports.create = async (req, res) => {
    try {
        const menuItem = new MenuItem(req.body);
        const savedMenuItem = await menuItem.save();
        res.status(201).json(savedMenuItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Lấy tất cả menu items
exports.findAll = async (req, res) => {
    try {
        // Lấy luôn thông tin tên category
        const menuItems = await MenuItem.find().populate('category_id', 'name');
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Lấy 1 menu item theo id
exports.findOne = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn' });
        }
        res.status(200).json(menuItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Cập nhật menu item
exports.update = async (req, res) => {
    try {
        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedMenuItem) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn để cập nhật' });
        }
        res.status(200).json(updatedMenuItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Xóa menu item
exports.delete = async (req, res) => {
    try {
        const deletedMenuItem = await MenuItem.findByIdAndDelete(req.params.id);
        if (!deletedMenuItem) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn để xóa' });
        }
        res.status(200).json({ message: 'Xóa thành công' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Lấy các món ăn theo category_id
exports.findByCategory = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ category_id: req.params.categoryId });
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy các món nổi bật
exports.findFeatured = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ is_featured: true });
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
