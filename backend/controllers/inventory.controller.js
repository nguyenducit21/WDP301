// controllers/inventory.controller.js
const Inventory = require('../models/inventory.model');

// Lấy tất cả nguyên liệu
const getAllInventory = async (req, res) => {
    try {
        const { category, search, low_stock } = req.query;
        let filter = { is_active: true };
        
        if (category) filter.category = category;
        if (search) filter.name = { $regex: search, $options: 'i' };
        
        let inventories = await Inventory.find(filter).sort({ name: 1 });
        
        // Lọc sắp hết hàng nếu cần
        if (low_stock === 'true') {
            inventories = inventories.filter(inv => inv.current_stock <= inv.min_stock_level);
        }
        
        res.json({
            success: true,
            data: inventories
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy danh sách nguyên liệu' 
        });
    }
};

// Thêm nguyên liệu mới
const createInventory = async (req, res) => {
    try {
        const inventory = new Inventory(req.body);
        await inventory.save();
        
        res.status(201).json({
            success: true,
            data: inventory,
            message: 'Thêm nguyên liệu thành công'
        });
    } catch (error) {
        console.error('Create inventory error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Cập nhật nguyên liệu
const updateInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body, updated_at: new Date() };
        
        const inventory = await Inventory.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );
        
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }
        
        res.json({
            success: true,
            data: inventory,
            message: 'Cập nhật nguyên liệu thành công'
        });
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Nhập kho (tăng số lượng)
const importStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, cost_per_unit } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng nhập phải lớn hơn 0'
            });
        }
        
        const inventory = await Inventory.findById(id);
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }
        
        // Cập nhật tồn kho và giá
        inventory.current_stock += quantity;
        if (cost_per_unit) {
            inventory.cost_per_unit = cost_per_unit;
        }
        inventory.updated_at = new Date();
        
        await inventory.save();
        
        res.json({
            success: true,
            data: inventory,
            message: `Nhập kho thành công ${quantity} ${inventory.unit}`
        });
    } catch (error) {
        console.error('Import stock error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Lấy nguyên liệu sắp hết
const getLowStockItems = async (req, res) => {
    try {
        const lowStockItems = await Inventory.find({
            is_active: true,
            $expr: { $lte: ['$current_stock', '$min_stock_level'] }
        }).sort({ current_stock: 1 });
        
        res.json({
            success: true,
            data: lowStockItems
        });
    } catch (error) {
        console.error('Get low stock error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy danh sách sắp hết hàng' 
        });
    }
};

// Xóa nguyên liệu (soft delete)
const deleteInventory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const inventory = await Inventory.findByIdAndUpdate(
            id,
            { is_active: false, updated_at: new Date() },
            { new: true }
        );
        
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }
        
        res.json({
            success: true,
            message: 'Xóa nguyên liệu thành công'
        });
    } catch (error) {
        console.error('Delete inventory error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

module.exports = {
    getAllInventory,
    createInventory,
    updateInventory,
    importStock,
    getLowStockItems,
    deleteInventory
};
