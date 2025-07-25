const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderAssignmentSchema = new Schema({
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Reservation', // Có thể là Reservation hoặc Order
        required: true
    },
    order_type: {
        type: String,
        enum: ['reservation', 'order'],
        required: true
    },
    assigned_to: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    status: {
        type: String,
        enum: ['waiting', 'processing', 'completed', 'cancelled'],
        default: 'processing'
    },
    rejected_by: [{
        employee_id: { type: Schema.Types.ObjectId, ref: 'User' },
        rejected_at: { type: Date, default: Date.now },
        reason: { type: String, default: '' }
    }],
    priority: {
        type: Number,
        default: 1 // 1: Bình thường, 2: Cao, 3: Khẩn cấp
    },
    assigned_at: {
        type: Date
    },
    completed_at: {
        type: Date
    },
    timeout_at: {
        type: Date // Thời gian hết hạn nếu không ai nhận
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

// Index để tối ưu query
OrderAssignmentSchema.index({ order_id: 1, order_type: 1 });
OrderAssignmentSchema.index({ assigned_to: 1, status: 1 });
OrderAssignmentSchema.index({ status: 1, created_at: -1 });

// Middleware để update timestamp
OrderAssignmentSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = mongoose.model('OrderAssignment', OrderAssignmentSchema); 