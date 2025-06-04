const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
const CategorySchema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Category', CategorySchema);
