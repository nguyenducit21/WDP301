const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    reservation_id: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    table_id: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    staff_id: { type: Schema.Types.ObjectId, ref: 'User' },
    order_items: [{
        menu_item_id: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    combo_items: [{
        combo_id: { type: Schema.Types.ObjectId, ref: 'Combo', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    status: {
        type: String,
        enum: ['pending', 'preparing', 'served', 'completed', 'cancelled'],
        default: 'pending'
    },
    note: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
