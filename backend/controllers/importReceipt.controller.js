// controllers/importReceipt.controller.js
const ImportReceipt = require('../models/importReceipt.model');
const Inventory = require('../models/inventory.model');
const InventoryHistory = require('../models/inventoryHistory.model');
const User = require('../models/user.model');
const mongoose = require('mongoose'); //


/**
 * Lấy danh sách phiếu nhập hàng
 */
const getAllImportReceipts = async (req, res) => {
    try {
        const { from, to, staff, search } = req.query;
        const filter = {};

        // Filter theo ngày
        if (from || to) {
            filter.created_at = {};
            if (from) filter.created_at.$gte = new Date(from);
            if (to) filter.created_at.$lte = new Date(to + 'T23:59:59');
        }

        // Filter theo nhân viên
        if (staff) {
            const staffObj = await User.findOne({
                full_name: { $regex: staff, $options: 'i' }
            });
            filter.staff_id = staffObj?._id || null;
        }

        // Filter theo search
        if (search) {
            filter.$or = [
                { content: { $regex: search, $options: 'i' } },
                { receipt_code: { $regex: search, $options: 'i' } }
            ];
        }

        const receipts = await ImportReceipt.find(filter)
            .populate('staff_id', 'full_name')
            .populate('items.inventory_id', 'name unit')
            .sort({ receipt_code: -1 });

        res.json({ success: true, data: receipts });
    } catch (error) {
        console.error('getAllImportReceipts error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách phiếu nhập'
        });
    }
};

/**
 * Tạo mới phiếu nhập hàng
 */
const createImportReceipt = async (req, res) => {
    // ✅ SỬ DỤNG TRANSACTION để đảm bảo data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { content, items } = req.body;
        const staffId = req.user.userId || req.user._id;

        // Validation
        if (!staffId) {
            await session.abortTransaction();
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        if (!items?.length) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Items array is required'
            });
        }

        // ✅ VALIDATE items với inventory check
        const processedItems = [];
        for (const item of items) {
            if (!item.inventory_id || !item.supplier || !item.quantity || !item.unit_price) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Thông tin item không đầy đủ'
                });
            }

            // ✅ KIỂM TRA inventory có tồn tại không
            const inventory = await Inventory.findById(item.inventory_id).session(session);
            if (!inventory || !inventory.isactive) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Không tìm thấy nguyên liệu với ID: ${item.inventory_id}`
                });
            }

            // ✅ KIỂM TRA unit có match không
            if (item.unit !== inventory.unit) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Đơn vị không khớp. Nguyên liệu ${inventory.name} có đơn vị ${inventory.unit}, không phải ${item.unit}`
                });
            }

            processedItems.push({
                ...item,
                total_price: Number(item.quantity) * Number(item.unit_price)
            });
        }

        const total_amount = processedItems.reduce((sum, item) =>
            sum + item.total_price, 0
        );

        // ✅ TẠO PHIẾU NHẬP
        const receipt = await ImportReceipt.create([{
            staff_id: staffId,
            content: content?.trim() || 'Phiếu nhập hàng',
            items: processedItems,
            total_amount
        }], { session });
        for (const item of processedItems) {
            const currentInventory = await Inventory.findById(item.inventory_id).session(session);

            await Inventory.findByIdAndUpdate(
                item.inventory_id,
                {
                    $inc: {
                        currentstock: Number(item.quantity),
                        total_imported: Number(item.quantity)
                    },
                    costperunit: Number(item.unit_price),
                    supplier: item.supplier,
                    // ✅ CẬP NHẬT TRACKING FIELDS
                    last_import_date: new Date(),
                    last_import_quantity: Number(item.quantity),
                    last_import_price: Number(item.unit_price),
                    updatedat: new Date()
                },
                { session }
            );
        }

        await session.commitTransaction();

        // Populate thông tin để trả về
        const populatedReceipt = await ImportReceipt.findById(receipt[0]._id)
            .populate('staff_id', 'full_name')
            .populate('items.inventory_id', 'name unit');

        res.status(201).json({
            success: true,
            message: 'Tạo phiếu nhập và cập nhật kho thành công',
            data: populatedReceipt
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('createImportReceipt error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi server'
        });
    } finally {
        session.endSession();
    }
};
/**
 * Xem chi tiết phiếu nhập
 */
const getImportReceiptById = async (req, res) => {
    try {
        const receipt = await ImportReceipt.findById(req.params.id)
            .populate('staff_id', 'full_name role')
            .populate('items.inventory_id', 'name unit');

        if (!receipt) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiếu nhập'
            });
        }

        res.json({ success: true, data: receipt });
    } catch (error) {
        console.error('getImportReceiptById error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllImportReceipts,
    createImportReceipt,
    getImportReceiptById
};
