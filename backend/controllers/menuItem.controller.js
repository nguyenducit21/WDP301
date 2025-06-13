const MenuItem = require("../models/menuItems.model");
const cloudinary = require("cloudinary").v2;
const fs = require('fs');

const createMenuItem = async (req, res) => {
    try {
        const { name, category_id, price, description, ingredients, is_available, is_featured, image } = req.body;

        const menuItem = new MenuItem({
            name,
            category_id,
            price: parseFloat(price),
            image: image || "default.jpg",
            description,
            ingredients: Array.isArray(ingredients) ? ingredients : [ingredients || ""],
            is_available: is_available === 'true',
            is_featured: is_featured === 'true',
        });

        const savedMenuItem = await menuItem.save();
        const populatedMenuItem = await MenuItem.findById(savedMenuItem._id)
            .populate('category_id', 'name');

        res.status(201).json({
            success: true,
            data: populatedMenuItem
        });
    } catch (error) {
        console.error("Create error:", error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getAllMenuItems = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ is_deleted: false })
            .populate("category_id", "name")
            .sort({ created_at: -1 });
        res.status(200).json({
            success: true,
            data: menuItems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getMenuItemById = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
            .populate("category_id", "name");
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }
        res.status(200).json({
            success: true,
            data: menuItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category_id, price, description, ingredients, is_available, is_featured, image } = req.body;

        const existingMenuItem = await MenuItem.findById(id);
        if (!existingMenuItem) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy món ăn để cập nhật'
            });
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

        // If new image URL is provided, update it
        if (image) {
            updateData.image = image;
        }

        const updatedMenuItem = await MenuItem.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).populate('category_id', 'name');

        res.status(200).json({
            success: true,
            data: updatedMenuItem
        });
    } catch (error) {
        console.error("Update error:", error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const deleteMenuItem = async (req, res) => {
    try {
        const deletedMenuItem = await MenuItem.findByIdAndUpdate(req.params.id,
            { is_deleted: true, is_available: false },
            { new: true }
        );
        if (!deletedMenuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "Menu item deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const deleteMany = async (req, res) => {
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
}

const getFeaturedMenuItems = async (req, res) => {
    try {
        const featuredMenuItems = await MenuItem.find({ is_featured: true, is_deleted: false })
            .populate("category_id", "name")
            .sort({ created_at: -1 });
        res.status(200).json({
            success: true,
            data: featuredMenuItems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getMenuItemsByCategory = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({
            category_id: req.params.categoryId,
            is_deleted: false,
        })
            .populate("category_id", "name")
            .sort({ created_at: -1 });
        res.status(200).json({
            success: true,
            data: menuItems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const restoreMenuItem = async (req, res) => {
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

const getMenuItemDeleted = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ is_deleted: true })
            .populate("category_id", "name")
            .sort({ updated_at: -1 });
        res.status(200).json({
            success: true,
            data: menuItems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createMenuItem,
    getAllMenuItems,
    getMenuItemById,
    updateMenuItem,
    deleteMenuItem,
    getFeaturedMenuItems,
    getMenuItemsByCategory,
    restoreMenuItem,
    deleteMany,
    getMenuItemDeleted
};