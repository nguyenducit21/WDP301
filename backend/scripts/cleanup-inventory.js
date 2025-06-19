// scripts/cleanup-inventory.js
require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('../models/inventory.model');
const MenuItemRecipe = require('../models/menuItemRecipe.model');

// Định nghĩa danh sách nguyên liệu cơ bản
const essentialIngredients = [
    // Thịt cá (6 loại)
    { name: "Thịt bò", category: "thịt", unit: "kg", cost: 450000, min_stock: 3 },
    { name: "Thịt heo", category: "thịt", unit: "kg", cost: 120000, min_stock: 3 },
    { name: "Sườn heo", category: "thịt", unit: "kg", cost: 150000, min_stock: 2 },
    { name: "Bì heo", category: "thịt", unit: "kg", cost: 80000, min_stock: 2 },
    { name: "Cá", category: "cá", unit: "kg", cost: 80000, min_stock: 3 },
    { name: "Tôm", category: "cá", unit: "kg", cost: 250000, min_stock: 2 },
    
    // Rau củ (6 loại)
    { name: "Rau sống", category: "rau_củ", unit: "kg", cost: 30000, min_stock: 1 },
    { name: "Rau thơm", category: "rau_củ", unit: "kg", cost: 40000, min_stock: 1 },
    { name: "Hành lá", category: "rau_củ", unit: "kg", cost: 35000, min_stock: 1 },
    { name: "Cà chua", category: "rau_củ", unit: "kg", cost: 20000, min_stock: 1 },
    { name: "Dưa leo", category: "rau_củ", unit: "kg", cost: 15000, min_stock: 1 },
    { name: "Xà lách", category: "rau_củ", unit: "kg", cost: 25000, min_stock: 1 },
    
    // Đồ khô (5 loại)
    { name: "Bánh phở", category: "đồ_khô", unit: "kg", cost: 35000, min_stock: 5 },
    { name: "Bún", category: "đồ_khô", unit: "kg", cost: 18000, min_stock: 5 },
    { name: "Cơm", category: "đồ_khô", unit: "kg", cost: 25000, min_stock: 10 },
    { name: "Miến", category: "đồ_khô", unit: "kg", cost: 60000, min_stock: 3 },
    { name: "Bánh tráng", category: "đồ_khô", unit: "kg", cost: 20000, min_stock: 2 },
    
    // Gia vị (6 loại)
    { name: "Nước mắm", category: "gia_vị", unit: "lít", cost: 120000, min_stock: 2 },
    { name: "Đường", category: "gia_vị", unit: "kg", cost: 22000, min_stock: 2 },
    { name: "Dầu ăn", category: "gia_vị", unit: "lít", cost: 45000, min_stock: 2 },
    { name: "Muối", category: "gia_vị", unit: "kg", cost: 8000, min_stock: 1 },
    { name: "Tiêu", category: "gia_vị", unit: "kg", cost: 180000, min_stock: 0.2 },
    { name: "Giấm", category: "gia_vị", unit: "lít", cost: 35000, min_stock: 1 },
    
    // Đồ uống (2 loại)
    { name: "Coca Cola", category: "đồ_uống", unit: "cái", cost: 12000, min_stock: 24 },
    { name: "Mirinda", category: "đồ_uống", unit: "cái", cost: 12000, min_stock: 24 },
    
    // Khác (1 loại)
    { name: "Trứng", category: "khác", unit: "cái", cost: 3500, min_stock: 30 }
];

async function cleanupInventory() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    try {
        console.log('🧹 Dọn dẹp nguyên liệu trùng lặp...');
        
        // Xóa tất cả inventory và recipe cũ
        await Inventory.deleteMany({});
        await MenuItemRecipe.deleteMany({});
        console.log('✅ Đã xóa dữ liệu cũ');
        
        // Tạo lại với danh sách hợp lý
        for (const item of essentialIngredients) {
            await Inventory.create({
                name: item.name,
                category: item.category,
                unit: item.unit,
                cost_per_unit: item.cost,
                min_stock_level: item.min_stock,
                current_stock: 0,
                supplier: 'Cần cập nhật nhà cung cấp',
                is_active: true
            });
            console.log(`  ✅ Tạo: ${item.name}`);
        }
        
        console.log(`\n🎉 Dọn dẹp hoàn thành!`);
        console.log(`📦 Tạo ${essentialIngredients.length} nguyên liệu cơ bản`);
        console.log(`🏷️  Phân loại:`);
        console.log(`   - Thịt cá: 6 loại`);
        console.log(`   - Rau củ: 6 loại`);
        console.log(`   - Đồ khô: 5 loại`);
        console.log(`   - Gia vị: 6 loại`);
        console.log(`   - Đồ uống: 2 loại`);
        console.log(`   - Khác: 1 loại`);
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Chạy script
if (require.main === module) {
    cleanupInventory();
}

module.exports = cleanupInventory;
