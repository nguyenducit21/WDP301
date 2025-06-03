const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    is_active: {
        type: Boolean,
        default: true, // Mặc định là true (Hoạt động)
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});
categorySchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});
categorySchema.pre('findOneAndUpdate', function (next) {
    this._update.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('Category', categorySchema);