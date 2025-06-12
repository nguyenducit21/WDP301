const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
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
            default: true, 
        },
        created_at: {
            type: Date,
            default: Date.now, 
        },
        updated_at: {
            type: Date,
            default: Date.now, 
        },
    },
    { versionKey: false }
);

categorySchema.pre('save', function (next) {
    this.updated_at = new Date(); 
    if (!this.created_at) {
        this.created_at = new Date(); 
    }
    next();
});

categorySchema.pre('findOneAndUpdate', function (next) {
    this._update.updated_at = new Date(); 
    next();
});

module.exports = mongoose.model('Category', categorySchema);