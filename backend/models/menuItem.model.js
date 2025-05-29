const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MenuItemSchema = new Schema({
    name: { type: String, required: true },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true },
    image: { type: String },
    description: { type: String },
    ingredients: [{ type: String }],
    is_featured: { type: Boolean, default: false },
    is_available: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);
