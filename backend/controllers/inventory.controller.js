// controllers/inventory.controller.js - ENHANCED VERSION
const Inventory = require('../models/inventory.model');
const ImportReceipt  = require('../models/importReceipt.model');
// Lấy tất cả nguyên liệu
const getAllInventory = async (req, res) => {
    try {
        const { search, lowstock } = req.query; // ✅ BỎ category
        let filter = { isactive: true };
        
        if (search) filter.name = { $regex: search, $options: 'i' };
        
        let inventories = await Inventory.find(filter).sort({ name: 1 });
        
        // Lọc sắp hết hàng nếu cần
        if (lowstock === 'true') {
            inventories = inventories.filter(inv => inv.currentstock <= inv.minstocklevel);
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

// ✅ THÊM function để lấy inventory theo ID
const getInventoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const inventory = await Inventory.findById(id);
        
        if (!inventory || !inventory.isactive) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }
        
        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        console.error('Get inventory by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Thêm nguyên liệu mới
const createInventory = async (req, res) => {
    try {
        const { name, unit, supplier, minstocklevel } = req.body; // ✅ BỎ costperunit và currentstock
        
        if (!name || !unit || !supplier) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (tên, đơn vị, nhà cung cấp)'
            });
        }
        
        // Kiểm tra trùng tên
        const existingInventory = await Inventory.findOne({ name, isactive: true });
        if (existingInventory) {
            return res.status(400).json({
                success: false,
                message: 'Tên nguyên liệu đã tồn tại'
            });
        }
        
        const inventory = new Inventory({
            name: name.trim(),
            unit,
            supplier: supplier.trim(),
            minstocklevel: Number(minstocklevel) || 10,
            costperunit: 0, // ✅ LUÔN BẮT ĐẦU TỪ 0
            currentstock: 0, // ✅ LUÔN BẮT ĐẦU TỪ 0
            createdat: new Date(),
            updatedat: new Date()
        });
        
        await inventory.save();
        
        res.status(201).json({
            success: true,
            data: inventory,
            message: 'Thêm nguyên liệu thành công. Hãy nhập hàng để có giá và số lượng.'
        });
    } catch (error) {
        console.error('Create inventory error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};
// ✅ LẤY LỊCH SỬ NHẬP HÀNG CỦA 1 NGUYÊN LIỆU
const getInventoryHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        // Kiểm tra inventory có tồn tại
        const inventory = await Inventory.findById(id);
        if (!inventory || !inventory.isactive) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }
        
        // ✅ TÌM TẤT CẢ ImportReceipt CÓ CHỨA INVENTORY NÀY
        const importReceipts = await ImportReceipt.find({
            'items.inventory_id': id
        })
        .populate('staff_id', 'full_name')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
        
        // ✅ ĐẾM TỔNG SỐ PHIẾU NHẬP CÓ CHỨA INVENTORY NÀY
        const total = await ImportReceipt.countDocuments({
            'items.inventory_id': id
        });
        
        // ✅ XỬ LÝ DỮ LIỆU TỪ ImportReceipt
        const historyData = [];
        
        for (const receipt of importReceipts) {
            // Tìm item tương ứng với inventory trong phiếu nhập
            const item = receipt.items.find(
                item => item.inventory_id.toString() === id
            );
            
            if (item) {
                historyData.push({
                    _id: receipt._id,
                    receipt_code: receipt.receipt_code,
                    import_date: receipt.created_at,
                    quantity_imported: item.quantity,
                    unit_price: item.unit_price,
                    supplier: item.supplier,
                    total_cost: item.total_price,
                    staff_name: receipt.staff_id?.full_name || 'N/A',
                    reason: `Nhập hàng theo phiếu ${receipt.receipt_code}`,
                    content: receipt.content
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                inventory: {
                    _id: inventory._id,
                    name: inventory.name,
                    unit: inventory.unit,
                    currentstock: inventory.currentstock,
                    total_imported: inventory.total_imported || 0
                },
                history: historyData,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalRecords: total,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Get inventory history error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử nhập hàng'
        });
    }
};
// ✅ CẬP NHẬT - CHỈ CHO PHÉP SỬA MỨC TỐI THIỂU, GIÁ, NHÀ CUNG CẤP
const updateInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, unit, costperunit, supplier, minstocklevel } = req.body; // ✅ KHÔNG cho sửa currentstock
        
        const existingInventory = await Inventory.findById(id);
        if (!existingInventory || !existingInventory.isactive) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }
        
        // Kiểm tra trùng tên (nếu thay đổi tên)
        if (name && name !== existingInventory.name) {
            const duplicateName = await Inventory.findOne({ 
                name: name, 
                isactive: true,
                _id: { $ne: id }
            });
            if (duplicateName) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên nguyên liệu đã tồn tại'
                });
            }
        }
        
        const updateData = {
            ...(name && { name: name.trim() }),
            ...(unit && { unit }),
            ...(costperunit && { costperunit: Number(costperunit) }),
            ...(supplier && { supplier: supplier.trim() }),
            ...(minstocklevel !== undefined && { minstocklevel: Number(minstocklevel) }),
            updatedat: new Date()
        };
        
        const inventory = await Inventory.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );
        
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

// ✅ THÊM - KIỂM KHO (Cập nhật số liệu thực tế)
const stockCheck = async (req, res) => {
    try {
        const { id } = req.params;
        const { actual_stock } = req.body;
        
        if (actual_stock === undefined || actual_stock < 0) {
            return res.status(400).json({
                success: false,
                message: 'Số liệu thực tế không hợp lệ'
            });
        }
        
        const inventory = await Inventory.findById(id);
        if (!inventory || !inventory.isactive) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }
        
        const oldStock = inventory.currentstock;
        const difference = Number(actual_stock) - oldStock;
        
        // Cập nhật số liệu thực tế
        inventory.currentstock = Number(actual_stock);
        inventory.updatedat = new Date();
        
        await inventory.save();
        
        res.json({
            success: true,
            data: inventory,
            message: `Cập nhật kiểm kho thành công. Chênh lệch: ${difference > 0 ? '+' : ''}${difference} ${inventory.unit}`,
            difference: difference
        });
    } catch (error) {
        console.error('Stock check error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Nhập kho (tăng số lượng) - GIỮ NGUYÊN
const importStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, costperunit } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng nhập phải lớn hơn 0'
            });
        }
        
        const inventory = await Inventory.findById(id);
        if (!inventory || !inventory.isactive) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }
        
        // Cập nhật tồn kho và giá
        inventory.currentstock += Number(quantity);
        if (costperunit && costperunit > 0) {
            inventory.costperunit = Number(costperunit);
        }
        inventory.updatedat = new Date();
        
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
            isactive: true,
            $expr: { $lte: ['$currentstock', '$minstocklevel'] }
        }).sort({ currentstock: 1 });
        
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
            { isactive: false, updatedat: new Date() },
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
    getInventoryById,
    createInventory,
    updateInventory,
    stockCheck,
    importStock,
    getLowStockItems,
    deleteInventory,
    getInventoryHistory 
};
