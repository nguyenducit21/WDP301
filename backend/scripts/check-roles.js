const mongoose = require('mongoose');
const Role = require('../models/role.model');
require('dotenv').config();

// Kết nối database
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const checkRoles = async () => {
    try {
        console.log('🔍 Kiểm tra roles trong database...\n');
        
        const roles = await Role.find().sort({ name: 1 });
        
        console.log(`📊 Tổng số roles: ${roles.length}\n`);
        
        roles.forEach((role, index) => {
            console.log(`${index + 1}. Role: ${role.name}`);
            console.log(`   - ID: ${role._id}`);
            console.log(`   - Description: ${role.description || 'Không có mô tả'}`);
            console.log(`   - Status: ${role.status || 'Không có status'}`);
            console.log(`   - Is System Role: ${role.is_system_role || false}`);
            console.log(`   - Permissions: ${role.permissions?.length || 0} quyền`);
            console.log('   ---');
        });
        
        // Kiểm tra roles cần thiết
        const requiredRoles = ['admin', 'manager', 'kitchen_staff', 'waiter', 'warehouse_staff', 'customer'];
        console.log('\n🎯 Kiểm tra roles cần thiết:');
        
        requiredRoles.forEach(roleName => {
            const role = roles.find(r => r.name === roleName);
            if (role) {
                console.log(`✅ ${roleName}: Có (${role.description || 'Không có mô tả'})`);
            } else {
                console.log(`❌ ${roleName}: Thiếu`);
            }
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra roles:', error);
    } finally {
        mongoose.connection.close();
    }
};

checkRoles();
