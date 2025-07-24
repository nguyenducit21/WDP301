const mongoose = require('mongoose');
const Role = require('../models/role.model');
require('dotenv').config();

// Kết nối database
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const rolesData = [
    {
        name: 'admin',
        description: 'Quản trị viên hệ thống',
        is_system_role: true,
        status: 'active'
    },
    {
        name: 'manager',
        description: 'Quản lý nhà hàng',
        is_system_role: true,
        status: 'active'
    },
    {
        name: 'kitchen_staff',
        description: 'Nhân viên bếp',
        is_system_role: false,
        status: 'active'
    },
    {
        name: 'waiter',
        description: 'Nhân viên phục vụ',
        is_system_role: false,
        status: 'active'
    },
    {
        name: 'warehouse_staff',
        description: 'Nhân viên kho',
        is_system_role: false,
        status: 'active'
    },
    {
        name: 'customer',
        description: 'Khách hàng',
        is_system_role: true,
        status: 'active'
    }
];

const seedRoles = async () => {
    try {
        console.log('🌱 Bắt đầu seed roles...\n');
        
        for (const roleData of rolesData) {
            // Kiểm tra xem role đã tồn tại chưa
            const existingRole = await Role.findOne({ name: roleData.name });
            
            if (existingRole) {
                console.log(`⚠️  Role "${roleData.name}" đã tồn tại, bỏ qua...`);
                
                // Cập nhật description và status nếu cần
                if (!existingRole.description || !existingRole.status) {
                    await Role.findByIdAndUpdate(existingRole._id, {
                        description: roleData.description,
                        status: roleData.status,
                        updated_at: new Date()
                    });
                    console.log(`   ✅ Đã cập nhật thông tin cho role "${roleData.name}"`);
                }
            } else {
                // Tạo role mới
                const newRole = new Role(roleData);
                await newRole.save();
                console.log(`✅ Đã tạo role "${roleData.name}"`);
            }
        }
        
        console.log('\n🎉 Hoàn thành seed roles!');
        
        // Hiển thị tất cả roles
        const allRoles = await Role.find().sort({ name: 1 });
        console.log(`\n📊 Tổng số roles: ${allRoles.length}`);
        allRoles.forEach(role => {
            console.log(`   - ${role.name}: ${role.description} (${role.status})`);
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi seed roles:', error);
    } finally {
        mongoose.connection.close();
    }
};

seedRoles();
