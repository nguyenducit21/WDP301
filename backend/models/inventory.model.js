const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventoryLogSchema = new Schema({
    inventory_id: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
    type: { type: String, enum: ['import', 'export', 'adjust'], required: true },
    quantity: { type: Number, required: true },
    staff_id: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryLog', InventoryLogSchema);
