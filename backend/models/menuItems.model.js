// models/menuItems.model.js - BỎ INGREDIENTS
const mongoose = require('mongoose');

const menuItemsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên món ăn không được bỏ trống'],
        trim: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Danh mục không được bỏ trống']
    },
    price: {
        type: Number,
        required: [true, 'Giá món ăn không được bỏ trống'],
        min: [0, 'Giá phải >= 0']
    },
    image: {
        type: String,
        required: [true, 'Ảnh món ăn không được bỏ trống']
    },
    description: {
        type: String,
        required: [true, 'Mô tả không được bỏ trống'],
        trim: true
    },
  
    total_ingredient_cost: { type: Number, default: 0, min: 0 },
    food_cost_percentage: { type: Number, default: 0, min: 0, max: 100 },
    can_prepare: { type: Boolean, default: true },
    preparation_time: { type: Number, default: 15 },
    difficulty_level: { 
        type: String, 
        enum: ['easy', 'medium', 'hard'], 
        default: 'medium' 
    },
    is_featured: { type: Boolean, default: false },
    is_available: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('MenuItem', menuItemsSchema);
