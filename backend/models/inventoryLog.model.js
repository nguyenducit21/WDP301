// models/inventoryLog.model.js (cập nhật)
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventoryLogSchema = new Schema({
    inventory_id: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
    batch_id: { type: Schema.Types.ObjectId, ref: 'InventoryBatch' },
    menu_item_id: { type: Schema.Types.ObjectId, ref: 'menuItems' },
    order_id: { type: Schema.Types.ObjectId, ref: 'Order' },
    type: { 
        type: String, 
        enum: ['import', 'export', 'adjust', 'expired', 'damaged'], 
        required: true 
    },
    quantity: { type: Number, required: true },
    unit_cost: { type: Number, required: true, min: 0 },
    total_cost: { type: Number, required: true, min: 0 },
    staff_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String },
    reference_document: { type: String }, // Số chứng từ
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryLog', InventoryLogSchema);
