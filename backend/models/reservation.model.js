const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReservationSchema = new Schema({
    customer_id: { type: Schema.Types.ObjectId, ref: 'User' },
    table_id: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    guest_count: { type: Number },
    contact_name: { type: String, required: true },
    contact_phone: { type: String, required: true },
    contact_email: { type: String },
    created_by_staff: {//phân biệt khách đặt hay nhân viên đặt hộ
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false // Null = khách tự đặt, có giá trị = nhân viên đặt
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'seated', 'cancelled', 'no_show', 'completed'],
        default: 'pending'
    },
    pre_order_items: [{
        menu_item_id: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        quantity: { type: Number }
    }],
    deposit_amount: { type: Number },
    payment_status: {
        type: String,
        enum: ['pending', 'partial', 'paid', 'refunded'],
        default: 'pending'
    },
    notes: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', ReservationSchema);
