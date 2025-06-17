// scripts/migrate-menu-to-inventory.js
require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const MenuItem = require('../models/menuItems.model');
const Inventory = require('../models/inventory.model');
const MenuItemRecipe = require('../models/menuItemRecipe.model');

// Kết nối MongoDB Atlas từ .env
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Kết nối MongoDB Atlas thành công');
        console.log('📍 Database:', mongoose.connection.name);
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB Atlas:', error);
        process.exit(1);
    }
};

async function migrateData() {
    await connectDB();
    
    try {
        console.log('🚀 Bắt đầu migration trên MongoDB Atlas...');
        
        // Kiểm tra collections hiện tại
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📋 Collections hiện có:', collections.map(c => c.name));
        
        // Lấy tất cả menu items
        const menuItems = await MenuItem.find({});
        console.log(`🍽️  Tìm thấy ${menuItems.length} món ăn trong database RMS`);
        
        if (menuItems.length === 0) {
            console.log('⚠️  Không có menu items nào. Kiểm tra lại collection name.');
            console.log('💡 Có thể collection name là "menuitems" thay vì "menuItems"');
            
            // Thử tìm với collection name khác
            const db = mongoose.connection.db;
            const allCollections = await db.listCollections().toArray();
            console.log('📋 Tất cả collections:', allCollections.map(c => c.name));
            
            await mongoose.connection.close();
            return;
        }
        
        let inventoryCreated = 0;
        let recipeCreated = 0;
        let errors = 0;
        
        for (const menuItem of menuItems) {
            console.log(`\n🍽️  Xử lý món: ${menuItem.name}`);
            
            if (menuItem.ingredients && menuItem.ingredients.length > 0) {
                console.log(`📝 Nguyên liệu: ${menuItem.ingredients.join(', ')}`);
                
                for (const ingredientName of menuItem.ingredients) {
                    try {
                        const result = await processIngredient(ingredientName, menuItem);
                        if (result.inventoryCreated) inventoryCreated++;
                        if (result.recipeCreated) recipeCreated++;
                    } catch (error) {
                        console.error(`❌ Lỗi xử lý ${ingredientName}:`, error.message);
                        errors++;
                    }
                }
            } else {
                console.log('⚠️  Món này không có nguyên liệu');
            }
        }
        
        console.log('\n🎉 Migration hoàn thành!');
        console.log(`📦 Tạo ${inventoryCreated} inventory records`);
        console.log(`📋 Tạo ${recipeCreated} recipe records`);
        console.log(`❌ ${errors} lỗi`);
        
        // Cập nhật cost cho menu items
        await updateMenuItemCosts();
        
    } catch (error) {
        console.error('❌ Migration thất bại:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Đã đóng kết nối database');
        process.exit(0);
    }
}

async function processIngredient(ingredientName, menuItem) {
    let inventoryCreated = false;
    let recipeCreated = false;
    
    try {
        // 1. Kiểm tra xem ingredient đã tồn tại chưa
        let inventory = await Inventory.findOne({ 
            name: { $regex: new RegExp(`^${ingredientName.trim()}$`, 'i') } 
        });
        
        if (!inventory) {
            // 2. Tạo inventory record mới
            inventory = new Inventory({
                name: ingredientName.trim(),
                category: mapCategory(ingredientName),
                unit: mapUnit(ingredientName),
                cost_per_unit: estimateCost(ingredientName),
                supplier: 'Cần cập nhật nhà cung cấp',
                min_stock_level: estimateMinStock(ingredientName),
                current_stock: 0
            });
            
            await inventory.save();
            console.log(`  ✅ Tạo inventory: ${ingredientName}`);
            inventoryCreated = true;
        } else {
            console.log(`  ⚠️  Inventory đã tồn tại: ${ingredientName}`);
        }
        
        // 3. Tạo recipe record
        const existingRecipe = await MenuItemRecipe.findOne({
            menu_item_id: menuItem._id,
            inventory_id: inventory._id
        });
        
        if (!existingRecipe) {
            const quantity = estimateQuantity(ingredientName, menuItem.name);
            const costPerServing = quantity * inventory.cost_per_unit;
            
            const recipe = new MenuItemRecipe({
                menu_item_id: menuItem._id,
                inventory_id: inventory._id,
                quantity_needed: quantity,
                unit: inventory.unit,
                cost_per_serving: costPerServing,
                is_main_ingredient: isMainIngredient(ingredientName, menuItem.ingredients)
            });
            
            await recipe.save();
            console.log(`  ✅ Tạo recipe: ${quantity} ${inventory.unit} - ${costPerServing.toLocaleString()} VND`);
            recipeCreated = true;
        } else {
            console.log(`  ⚠️  Recipe đã tồn tại: ${menuItem.name} - ${ingredientName}`);
        }
        
    } catch (error) {
        console.error(`  ❌ Lỗi xử lý ${ingredientName}:`, error.message);
        throw error;
    }
    
    return { inventoryCreated, recipeCreated };
}

// Cập nhật cost cho menu items
async function updateMenuItemCosts() {
    console.log('\n💰 Cập nhật chi phí món ăn...');
    
    try {
        const menuItems = await MenuItem.find({});
        
        for (const menuItem of menuItems) {
            const recipes = await MenuItemRecipe.find({ menu_item_id: menuItem._id });
            const totalCost = recipes.reduce((sum, recipe) => sum + recipe.cost_per_serving, 0);
            const costPercentage = menuItem.price > 0 ? (totalCost / menuItem.price * 100) : 0;
            
            await MenuItem.findByIdAndUpdate(menuItem._id, {
                total_ingredient_cost: totalCost,
                food_cost_percentage: costPercentage,
                updated_at: new Date()
            });
            
            console.log(`  ✅ ${menuItem.name}: ${totalCost.toLocaleString()} VND (${costPercentage.toFixed(1)}%)`);
        }
        
        console.log('💰 Hoàn thành cập nhật chi phí!');
    } catch (error) {
        console.error('❌ Lỗi cập nhật chi phí:', error);
    }
}

// Helper functions để map dữ liệu
function mapCategory(ingredientName) {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('thịt') || name.includes('bò') || name.includes('heo') || 
        name.includes('lợn') || name.includes('sườn') || name.includes('bắp bò') ||
        name.includes('bì heo')) {
        return 'thịt';
    }
    if (name.includes('cá') || name.includes('tôm') || name.includes('cua')) {
        return 'cá';
    }
    if (name.includes('rau') || name.includes('hành') || name.includes('cà chua') ||
        name.includes('dưa leo') || name.includes('xà lách') || name.includes('mộc nhĩ') ||
        name.includes('rau củ') || name.includes('rau thơm') || name.includes('rau sống') ||
        name.includes('rau mùi')) {
        return 'rau_củ';
    }
    if (name.includes('muối') || name.includes('tiêu') || name.includes('nước mắm') ||
        name.includes('đường') || name.includes('quế') || name.includes('hồi') ||
        name.includes('giấm') || name.includes('sốt') || name.includes('mỡ hành') ||
        name.includes('caramel')) {
        return 'gia_vị';
    }
    if (name.includes('bún') || name.includes('phở') || name.includes('miến') ||
        name.includes('cơm') || name.includes('bánh') || name.includes('nếp') ||
        name.includes('đậu') || name.includes('thạch')) {
        return 'đồ_khô';
    }
    if (name.includes('mirinda') || name.includes('coca') || name.includes('trà sữa') ||
        name.includes('sữa') || name.includes('nước')) {
        return 'đồ_uống';
    }
    
    return 'khác';
}

function mapUnit(ingredientName) {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('thịt') || name.includes('cá') || name.includes('bắp bò')) {
        return 'kg';
    }
    if (name.includes('rau') || name.includes('gia vị') || name.includes('đường') ||
        name.includes('muối') || name.includes('tiêu')) {
        return 'g';
    }
    if (name.includes('nước') || name.includes('sữa')) {
        return 'ml';
    }
    if (name.includes('trứng') || name.includes('hành')) {
        return 'cái';
    }
    if (name.includes('bún') || name.includes('phở') || name.includes('miến')) {
        return 'gói';
    }
    if (name.includes('mirinda') || name.includes('coca')) {
        return 'lon';
    }
    
    return 'g'; // default
}

function estimateCost(ingredientName) {
    const name = ingredientName.toLowerCase();
    
    // Ước tính giá theo VND/đơn vị
    if (name.includes('thịt bò') || name.includes('bắp bò')) return 350000; // VND/kg
    if (name.includes('thịt heo') || name.includes('thịt lợn')) return 180000; // VND/kg
    if (name.includes('sườn')) return 250000; // VND/kg
    if (name.includes('cá')) return 120000; // VND/kg
    if (name.includes('tôm')) return 300000; // VND/kg
    if (name.includes('cua')) return 200000; // VND/kg
    if (name.includes('trứng')) return 4000; // VND/cái
    if (name.includes('rau') || name.includes('hành')) return 30000; // VND/kg
    if (name.includes('bún') || name.includes('phở')) return 25000; // VND/gói
    if (name.includes('cơm')) return 20000; // VND/kg
    if (name.includes('mirinda') || name.includes('coca')) return 15000; // VND/lon
    if (name.includes('sữa')) return 50000; // VND/lít
    if (name.includes('đường')) return 25000; // VND/kg
    if (name.includes('nước mắm')) return 80000; // VND/lít
    
    return 20000; // default
}

function estimateQuantity(ingredientName, menuItemName) {
    const name = ingredientName.toLowerCase();
    const menuName = menuItemName.toLowerCase();
    
    // Ước tính số lượng cần thiết cho 1 phần ăn
    if (name.includes('thịt') || name.includes('cá')) {
        if (menuName.includes('phở') || menuName.includes('bún')) return 0.15; // 150g
        if (menuName.includes('cơm')) return 0.2; // 200g
        return 0.1; // 100g default
    }
    
    if (name.includes('bún') || name.includes('phở')) return 0.1; // 100g
    if (name.includes('cơm')) return 0.15; // 150g
    if (name.includes('rau') || name.includes('hành')) return 0.03; // 30g
    if (name.includes('gia vị') || name.includes('đường')) return 0.005; // 5g
    if (name.includes('trứng')) return 1; // 1 quả
    if (name.includes('mirinda') || name.includes('coca')) return 1; // 1 lon
    if (name.includes('sữa')) return 0.1; // 100ml
    
    return 0.05; // 50g default
}

function estimateMinStock(ingredientName) {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('thịt') || name.includes('cá')) return 5; // 5kg
    if (name.includes('rau')) return 2; // 2kg
    if (name.includes('bún') || name.includes('phở')) return 10; // 10 gói
    if (name.includes('gia vị')) return 1; // 1kg
    if (name.includes('mirinda') || name.includes('coca')) return 20; // 20 lon
    
    return 5; // default
}

function isMainIngredient(ingredientName, allIngredients) {
    // Nguyên liệu đầu tiên thường là nguyên liệu chính
    const index = allIngredients.indexOf(ingredientName);
    return index === 0 || index === 1; // 2 nguyên liệu đầu
}

// Chạy migration
if (require.main === module) {
    migrateData();
}

module.exports = migrateData;
