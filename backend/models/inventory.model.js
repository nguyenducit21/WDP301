// models/inventory.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventorySchema = new Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    category: {
        type: String,
        required: true,
        enum: ['thịt', 'cá', 'rau_củ', 'gia_vị', 'đồ_khô', 'đồ_uống', 'khác']
    },
    unit: {
        type: String,
        required: true,
        enum: ['kg', 'lít', 'cái', 'gói']
    },
    current_stock: { 
        type: Number, 
        required: true, 
        min: 0, 
        default: 0 
    },
    min_stock_level: { 
        type: Number, 
        required: true, 
        min: 0, 
        default: 10 
    },
    cost_per_unit: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    supplier: { 
        type: String, 
        required: true 
    },
    is_active: { 
        type: Boolean, 
        default: true 
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    },
    updated_at: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Inventory', InventorySchema);
