// models/importReceipt.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImportReceiptItemSchema = new Schema({
    inventory_id: {
        type: Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true
    },
    supplier: {
        type: String,
        required: true,
        trim: true
    },
    unit: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unit_price: {
        type: Number,
        required: true,
        min: 0
    },
    total_price: {
        type: Number,
        required: true,
        min: 0
    }
});

const ImportReceiptSchema = new Schema({
    receipt_code: {
        type: String,
        unique: true
        // ✅ Format: PN202506001, PN202506002, PN202506003...
    },
    staff_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    content: {
        type: String,
        default: 'Phiếu nhập hàng',
        trim: true
    },
    items: [ImportReceiptItemSchema],
    total_amount: {
        type: Number,
        required: true,
        min: 0
    }
});

// ✅ CHỈ SỬA PHẦN NÀY - Pre-save hook với format PN + Ngày + STT
ImportReceiptSchema.pre('save', async function (next) {
    if (this.isNew && !this.receipt_code) {
        try {
            // ✅ THAY ĐỔI: Tạo prefix với ngày đầy đủ
            const today = new Date();
            const dateStr = today.getFullYear().toString() +
                (today.getMonth() + 1).toString().padStart(2, '0') +
                today.getDate().toString().padStart(2, '0');
            const prefix = `PN${dateStr}`; // PN20250619

            // Tìm mã phiếu lớn nhất trong ngày hiện tại
            const lastReceipt = await this.constructor
                .findOne({
                    receipt_code: { $regex: `^${prefix}` }
                })
                .sort({ receipt_code: -1 })
                .exec();

            let nextNumber = 1;
            if (lastReceipt && lastReceipt.receipt_code) {
                // Extract số từ mã phiếu cuối (PN20250619001 -> 001 -> 1)
                const lastNumber = parseInt(lastReceipt.receipt_code.slice(-3));
                nextNumber = lastNumber + 1;
            }

            // Tạo mã phiếu: PN20250619001, PN20250619002...
            this.receipt_code = `${prefix}${String(nextNumber).padStart(3, '0')}`;
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

module.exports = mongoose.model('ImportReceipt', ImportReceiptSchema);
