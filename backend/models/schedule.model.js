const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ScheduleSchema = new Schema({
    employee_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    start_time: {
        type: String,
        required: true
    },
    end_time: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    shift_type: {
        type: String,
        enum: ['morning', 'afternoon', 'night', 'full_day'],
        required: true
    },
    notes: {
        type: String,
        default: ''
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
ScheduleSchema.index({ employee_id: 1, date: 1 });

module.exports = mongoose.model('Schedule', ScheduleSchema); 