// models/inventoryHistory.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventoryHistorySchema = new Schema({
  inventory_id: {
    type: Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  import_receipt_id: {
    type: Schema.Types.ObjectId,
    ref: 'ImportReceipt',
    required: true
  },
  action: {
    type: String,
    enum: ['import', 'export', 'adjust'],
    required: true
  },
  quantity_before: { type: Number, required: true },
  quantity_change: { type: Number, required: true },
  quantity_after: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  reason: { type: String },
  staff_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryHistory', InventoryHistorySchema);
