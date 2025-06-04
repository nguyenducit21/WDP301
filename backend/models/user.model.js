const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Nên mã hóa (bcrypt)
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    full_name: { type: String },
    avatar: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
