const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PermissionSchema = new Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true 
    }, // Tên quyền: 'create_user', 'edit_menu', 'view_orders', etc.
    
    resource: { 
        type: String, 
        required: true 
    }, // Tài nguyên: 'users', 'menu_items', 'orders', 'tables', etc.
    
    action: { 
        type: String, 
        required: true,
        enum: ['create', 'read', 'update', 'delete', 'manage'] 
    }, // Hành động
    
    description: { 
        type: String 
    }, // Mô tả quyền
    
    module: { 
        type: String, 
        required: true 
    }, // Module: 'user_management', 'menu_management', 'order_management', etc.
    
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
PermissionSchema.index({ resource: 1, action: 1 });
PermissionSchema.index({ module: 1 });

module.exports = mongoose.model('Permission', PermissionSchema);
