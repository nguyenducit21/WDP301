const { MenuItem } = require("../models/menuItem");

const createMenuItem = async (req, res) => {
    try {
        const menuItem = new MenuItem({
            ...req.body,
            updated_at: Date.now(),
        });
        const savedMenuItem = await menuItem.save();
        res.status(201).json(savedMenuItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllMenuItems = async (req, res) => {
    try {
        const menuItems = await MenuItem.find()
            .populate("category_id", "name")
            .sort({ created_at: -1 });
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMenuItemById = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
            .populate("category_id", "name");
        res.status(200).json(menuItem);
        if (!menuItem) {
            return res.status(404).json({ message: "Menu item not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateMenuItem = async (req, res) => {

    try {
        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updated_at: Date.now() },
            { new: true }
        ).populate("category_id", "name");
        if (!updatedMenuItem) {
            return res.status(404).json({ message: "Menu item not found" });
        }
        res.status(200).json(updatedMenuItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteMenuItem = async (req, res) => {

    try {
        const deletedMenuItem = await MenuItem.findByIdAndDelete(req.params.id);
        if (!deletedMenuItem) {
            return res.status(404).json({ message: "Menu item not found" });
        }
        res.status(200).json({ message: "Menu item deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getFeaturedMenuItems = async (req, res) => {
    try {
        const featuredMenuItems = await MenuItem.find({ is_featured: true })
            .populate("category_id", "name")
            .sort({ created_at: -1 });
        res.status(200).json(featuredMenuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMenuItemsByCategory = async (req, res) => {

    try {
        const menuItems = await MenuItem.find({ category_id: req.params.categoryId })
            .populate("category_id", "name")
            .sort({ created_at: -1 });
        res.status(200).json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = {
    createMenuItem,
    getAllMenuItems,
    getMenuItemById,
    updateMenuItem,
    deleteMenuItem,
    getFeaturedMenuItems,
    getMenuItemsByCategory
};