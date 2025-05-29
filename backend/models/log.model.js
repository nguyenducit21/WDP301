const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LogSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    target_type: { type: String, required: true }, // 'reservation', 'order', ...
    target_id: { type: Schema.Types.ObjectId, required: true },
    detail: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', LogSchema);
