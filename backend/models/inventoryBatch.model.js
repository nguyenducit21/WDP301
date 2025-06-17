// models/inventoryBatch.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventoryBatchSchema = new Schema({
    inventory_id: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
    batch_number: { type: String, required: true },
    import_quantity: { type: Number, required: true, min: 0 },
    remaining_quantity: { type: Number, required: true, min: 0 },
    unit_cost: { type: Number, required: true, min: 0 },
    supplier: { type: String, required: true },
    import_date: { type: Date, required: true, default: Date.now },
    expiry_date: { type: Date, required: true },
    status: {
        type: String,
        enum: ['available', 'low_stock', 'expired', 'used_up'],
        default: 'available'
    },
    staff_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryBatch', InventoryBatchSchema);
