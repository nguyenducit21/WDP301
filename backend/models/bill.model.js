const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BillSchema = new Schema({
    order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    reservation_id: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    table_id: { type: Schema.Types.ObjectId, ref: 'Table' },
    customer_id: { type: Schema.Types.ObjectId, ref: 'User' },
    staff_id: { type: Schema.Types.ObjectId, ref: 'User' },
    total_amount: { type: Number, required: true },
    vat: { type: Number },
    discount: { type: Number },
    final_amount: { type: Number, required: true },
    payment_method: { type: String, enum: ['cash', 'credit_card', 'momo', 'vnpay'], required: true },
    payment_status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    paid_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bill', BillSchema);
