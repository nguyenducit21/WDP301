// models/menuItemRecipe.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MenuItemRecipeSchema = new Schema({
    menu_item_id: { 
        type: Schema.Types.ObjectId, 
        ref: 'menuItems', 
        required: true 
    },
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
    },
    cost_per_serving: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    is_main_ingredient: { 
        type: Boolean, 
        default: false 
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

// Đảm bảo mỗi món chỉ có 1 record cho 1 nguyên liệu
MenuItemRecipeSchema.index({ menu_item_id: 1, inventory_id: 1 }, { unique: true });

module.exports = mongoose.model('MenuItemRecipe', MenuItemRecipeSchema);
