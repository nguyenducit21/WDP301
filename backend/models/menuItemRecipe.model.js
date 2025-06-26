// models/menuItemRecipe.model.js - SỬA THÀNH ARRAY
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ✅ SUB-SCHEMA cho từng nguyên liệu
const IngredientItemSchema = new Schema({
    inventory_id: { 
        type: Schema.Types.ObjectId, 
        ref: 'Inventory', 
        required: true 
    },
    quantity_needed: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    unit: { 
        type: String, 
        required: true 
    }
}, { _id: false }); // Không tạo _id cho sub-document

// ✅ MAIN SCHEMA - 1 record cho 1 món ăn
const MenuItemRecipeSchema = new Schema({
    menu_item_id: { 
        type: Schema.Types.ObjectId, 
        ref: 'menuItem', 
        required: true,
        unique: true // ✅ ĐẢM BẢO CHỈ 1 RECORD CHO 1 MÓN ĂN
    },
    ingredients: [IngredientItemSchema], // ✅ ARRAY CÁC NGUYÊN LIỆU
    created_at: { 
        type: Date, 
        default: Date.now 
    },
    updated_at: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('MenuItemRecipe', MenuItemRecipeSchema);
