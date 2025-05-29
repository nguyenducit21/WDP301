const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReservationSchema = new Schema({
    customer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    table_id: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    guest_count: { type: Number },
    contact_name: { type: String },
    contact_phone: { type: String },
    contact_email: { type: String },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'no_show', 'completed'],
        default: 'pending'
    },
    pre_order_items: [{
        menu_item_id: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true }
    }],
    deposit_amount: { type: Number },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending'
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', ReservationSchema);
