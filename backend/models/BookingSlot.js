const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookingSlotSchema = new Schema({
    number: { type: Number, required: true }, 
    name: { type: String }, // Ví dụ: "Sáng", "Trưa", "Tối"
    start_time: { type: String, required: true }, // VD: "07:00"
    end_time: { type: String, required: true },   // VD: "09:00"
    description: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BookingSlot', BookingSlotSchema);
