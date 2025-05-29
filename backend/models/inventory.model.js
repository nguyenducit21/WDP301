const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventorySchema = new Schema({
    name: { type: String, required: true },
    unit: { type: String, required: true }, // kg, lít, cái...
    quantity: { type: Number, required: true },
    min_quantity: { type: Number },
    price: { type: Number, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inventory', InventorySchema);
