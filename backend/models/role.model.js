const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoleSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    }, // admin, manager, staff, customer, warehouse_staff, kitchen_staff, waiter

    description: {
        type: String
    },

    permissions: [{
        type: Schema.Types.ObjectId,
        ref: 'Permission'
    }], // Danh sách các quyền của role này

    is_system_role: {
        type: Boolean,
        default: false
    }, // Đánh dấu role hệ thống không được xóa

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
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

// Index để tối ưu hóa truy vấn
RoleSchema.index({ name: 1 });
RoleSchema.index({ status: 1 });

module.exports = mongoose.model('Role', RoleSchema);
