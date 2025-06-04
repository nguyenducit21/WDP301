const MenuItem = require('../models/menuItem.model');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

exports.create = [
    upload.single('image'),
    async (req, res) => {
        try {
            const { name, category_id, price, description, ingredients, is_available, is_featured } = req.body;
            const menuItem = new MenuItem({
                name,
                category_id,
                price: parseFloat(price),
                image: req.file ? req.file.filename : "default.jpg",
                description,
                ingredients: Array.isArray(ingredients) ? ingredients : [ingredients || ""],
                is_available: is_available === 'true',
                is_featured: is_featured === 'true',
            });
            const savedMenuItem = await menuItem.save();
            const populatedMenuItem = await MenuItem.findById(savedMenuItem._id).populate('category_id', 'name');
            res.status(201).json(populatedMenuItem);
        } catch (error) {
            console.error("Create error:", error);
            res.status(400).json({ message: error.message });
        }
    },
];

exports.findAll = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ is_deleted: false }).populate('category_id', 'name');
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.findDeleted = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ is_deleted: true }).populate('category_id', 'name');
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.findOne = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id).populate('category_id', 'name');
        if (!menuItem) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn' });
        }
        res.status(200).json(menuItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.update = [
    upload.single('image'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { name, category_id, price, description, ingredients, is_available, is_featured } = req.body;
            const existingMenuItem = await MenuItem.findById(id);
            if (!existingMenuItem) {
                return res.status(404).json({ message: 'Không tìm thấy món ăn để cập nhật' });
            }
            const updateData = {
                name,
                category_id,
                price: parseFloat(price),
                description,
                ingredients: Array.isArray(ingredients) ? ingredients : [ingredients || ""],
                is_available: is_available === 'true',
                is_featured: is_featured === 'true',
                updated_at: new Date(),
            };
            if (req.file) {
                updateData.image = req.file.filename;
            } else {
                updateData.image = existingMenuItem.image;
            }
            const updatedMenuItem = await MenuItem.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true,
            }).populate('category_id', 'name');
            res.status(200).json(updatedMenuItem);
        } catch (error) {
            console.error("Update error:", error);
            res.status(400).json({ message: error.message });
        }
    },
];

exports.delete = async (req, res) => {
    try {
        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            { is_deleted: true, is_available: false },
            { new: true }
        );
        if (!updatedMenuItem) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn để xóa' });
        }
        res.status(200).json({ message: 'Xóa tạm thời thành công' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteMany = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Danh sách ID không hợp lệ' });
        }
        const result = await MenuItem.updateMany(
            { _id: { $in: ids } },
            { is_deleted: true, is_available: false }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn nào để xóa' });
        }
        res.status(200).json({ message: 'Xóa tạm thời các món ăn thành công' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.restore = async (req, res) => {
    try {
        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            { is_deleted: false, is_available: true },
            { new: true }
        ).populate('category_id', 'name');
        if (!updatedMenuItem) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn để khôi phục' });
        }
        res.status(200).json(updatedMenuItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.findByCategory = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ 
            category_id: req.params.categoryId,
            is_deleted: false 
        }).populate('category_id', 'name');
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.findFeatured = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ 
            is_featured: true,
            is_deleted: false 
        }).populate('category_id', 'name');
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};