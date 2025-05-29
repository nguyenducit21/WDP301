const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ComboSchema = new Schema({
    name: { type: String, required: true },
    items: [{
        menu_item_id: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true }
    }],
    price: { type: Number, required: true },
    description: { type: String },
    is_active: { type: Boolean, default: true },
    promotion: {
        discount_percent: { type: Number },
        start_date: { type: Date },
        end_date: { type: Date }
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Combo', ComboSchema);
