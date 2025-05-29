const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TableSchema = new Schema({
    name: { type: String, required: true },
    area_id: { type: Schema.Types.ObjectId, ref: 'Area', required: true },
    type: { type: String }, // "gia đình", "cặp đôi", ...
    capacity: { type: Number },
    status: {
        type: String,
        enum: ['available', 'reserved', 'occupied', 'cleaning', 'maintenance'],
        default: 'available'
    },
    description: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Table', TableSchema);
