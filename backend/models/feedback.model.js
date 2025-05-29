const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeedbackSchema = new Schema({
    customer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    menu_item_id: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
    combo_id: { type: Schema.Types.ObjectId, ref: 'Combo' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
