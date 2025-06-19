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
        
        // Cập nhật giá bán trước
        await updateMenuItemPrices();
        
        // Sau đó cập nhật cost với giá mới
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

// Cập nhật giá bán theo thị trường
async function updateMenuItemPrices() {
    console.log('\n💰 Cập nhật giá bán theo thị trường...');
    
    const priceUpdates = [
        // Giảm giá các món quá cao
        { name: "Gỏi bắp bò", newPrice: 85000, reason: "Giảm từ 130k - quá cao so với thị trường" },
        
        // Tăng giá các món quá thấp
        { name: "Trà sữa chân trâu", newPrice: 35000, reason: "Tăng từ 30k - thấp hơn thị trường" },
        { name: "Salad cá ngừ", newPrice: 45000, reason: "Tăng từ 35k - chi phí nguyên liệu cao" },
        { name: "Súp cua", newPrice: 40000, reason: "Tăng từ 30k - cua đắt tiền" },
        
        // Điều chỉnh nhẹ để tối ưu food cost
        { name: "Chè đậu xanh", newPrice: 20000, reason: "Tăng từ 18k - phù hợp với chi phí" },
        { name: "Sữa chua nếp cẩm", newPrice: 25000, reason: "Tăng từ 22k - nguyên liệu đặc biệt" },
        { name: "Cơm cháy", newPrice: 35000, reason: "Tăng từ 30k - món đặc sản" }
    ];
    
    for (const update of priceUpdates) {
        try {
            const menuItem = await MenuItem.findOne({ 
                name: { $regex: new RegExp(update.name, 'i') } 
            });
            
            if (menuItem) {
                const oldPrice = menuItem.price;
                await MenuItem.findByIdAndUpdate(menuItem._id, {
                    price: update.newPrice,
                    updated_at: new Date()
                });
                
                console.log(`  ✅ ${update.name}:`);
                console.log(`     ${oldPrice.toLocaleString()} → ${update.newPrice.toLocaleString()} VND`);
                console.log(`     Lý do: ${update.reason}`);
            }
        } catch (error) {
            console.error(`❌ Lỗi cập nhật ${update.name}:`, error.message);
        }
    }
}

// Cập nhật cost cho menu items theo chuẩn F&B
async function updateMenuItemCosts() {
    console.log('\n💰 Cập nhật chi phí món ăn theo chuẩn F&B...');
    
    try {
        const menuItems = await MenuItem.find({});
        
        for (const menuItem of menuItems) {
            const recipes = await MenuItemRecipe.find({ menu_item_id: menuItem._id });
            const totalIngredientCost = recipes.reduce((sum, recipe) => sum + recipe.cost_per_serving, 0);
            
            // Food cost percentage (chi phí nguyên liệu / giá bán)
            const foodCostPercentage = menuItem.price > 0 ? (totalIngredientCost / menuItem.price * 100) : 0;
            
            // Đánh giá tính khả thi
            let profitability = 'excellent';
            if (foodCostPercentage > 35) profitability = 'poor';
            else if (foodCostPercentage > 30) profitability = 'average';
            else if (foodCostPercentage > 25) profitability = 'good';
            
            await MenuItem.findByIdAndUpdate(menuItem._id, {
                total_ingredient_cost: Math.round(totalIngredientCost),
                food_cost_percentage: Math.round(foodCostPercentage * 10) / 10,
                updated_at: new Date()
            });
            
            console.log(`  ✅ ${menuItem.name}:`);
            console.log(`     - Chi phí NL: ${totalIngredientCost.toLocaleString()} VND`);
            console.log(`     - Giá bán: ${menuItem.price.toLocaleString()} VND`);
            console.log(`     - Food Cost: ${foodCostPercentage.toFixed(1)}% (${profitability})`);
            console.log(`     - Lợi nhuận gross: ${(menuItem.price - totalIngredientCost).toLocaleString()} VND`);
        }
        
        console.log('\n📊 Chuẩn ngành F&B Việt Nam:');
        console.log('   🟢 Food Cost xuất sắc: <25% (Excellent)');
        console.log('   🟡 Food Cost tốt: 25-30% (Good)');
        console.log('   🟠 Food Cost trung bình: 30-35% (Average)');
        console.log('   🔴 Food Cost kém: >35% (Poor)');
        console.log('💰 Hoàn thành cập nhật chi phí thực tế!');
    } catch (error) {
        console.error('❌ Lỗi cập nhật chi phí:', error);
    }
}

// Helper functions với giá cả thực tế VN 2025
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

// Cập nhật đơn vị thực tế
function mapUnit(ingredientName) {
    const name = ingredientName.toLowerCase();
    
    // Thịt cá bán theo kg
    if (name.includes('thịt') || name.includes('cá') || name.includes('tôm') || name.includes('cua')) {
        return 'kg';
    }
    
    // Rau củ bán theo kg
    if (name.includes('rau') || name.includes('cà chua') || name.includes('dưa leo')) {
        return 'kg';
    }
    
    // Đồ khô bán theo kg
    if (name.includes('bún') || name.includes('phở') || name.includes('miến') || 
        name.includes('cơm') || name.includes('gạo')) {
        return 'kg';
    }
    
    // Gia vị lỏng bán theo lít
    if (name.includes('nước mắm') || name.includes('dầu ăn') || name.includes('giấm')) {
        return 'lít';
    }
    
    // Gia vị khô bán theo kg
    if (name.includes('đường') || name.includes('muối') || name.includes('tiêu') ||
        name.includes('quế') || name.includes('hồi')) {
        return 'kg';
    }
    
    // Đồ uống bán theo lon/chai
    if (name.includes('coca') || name.includes('pepsi') || name.includes('mirinda')) {
        return 'lon';
    }
    if (name.includes('nước suối') || name.includes('sữa')) {
        return 'chai';
    }
    
    // Trứng bán theo quả
    if (name.includes('trứng')) {
        return 'quả';
    }
    
    return 'kg'; // default
}

// Giá nguyên liệu thực tế thị trường VN 2025
function estimateCost(ingredientName) {
    const name = ingredientName.toLowerCase();
    
    // Giá thịt (VND/kg)
    if (name.includes('thịt bò') || name.includes('bắp bò')) return 450000; // Thịt bò cao cấp
    if (name.includes('thịt heo') || name.includes('thịt lợn')) return 120000; // Thịt heo thường
    if (name.includes('sườn heo')) return 150000;
    if (name.includes('sườn bò')) return 380000;
    if (name.includes('bì heo')) return 80000;
    
    // Hải sản (VND/kg)
    if (name.includes('cá tra') || name.includes('cá basa')) return 45000;
    if (name.includes('cá hồi')) return 280000;
    if (name.includes('tôm sú')) return 350000;
    if (name.includes('tôm thẻ')) return 180000;
    if (name.includes('cua')) return 250000;
    if (name.includes('cá')) return 80000; // Cá thường
    
    // Rau củ (VND/kg)
    if (name.includes('rau xà lách')) return 25000;
    if (name.includes('rau mùi') || name.includes('rau thơm')) return 40000;
    if (name.includes('hành lá')) return 35000;
    if (name.includes('cà chua')) return 20000;
    if (name.includes('dưa leo')) return 15000;
    if (name.includes('rau sống') || name.includes('rau')) return 30000;
    
    // Đồ khô (VND/kg hoặc gói)
    if (name.includes('bánh phở')) return 35000; // VND/kg
    if (name.includes('bún tươi')) return 18000; // VND/kg
    if (name.includes('bún khô')) return 45000; // VND/kg
    if (name.includes('miến')) return 60000; // VND/kg
    if (name.includes('cơm')) return 25000; // VND/kg gạo
    if (name.includes('bánh mì')) return 8000; // VND/ổ
    
    // Gia vị (VND/kg hoặc lít)
    if (name.includes('nước mắm')) return 120000; // VND/lít
    if (name.includes('dầu ăn')) return 45000; // VND/lít
    if (name.includes('đường')) return 22000; // VND/kg
    if (name.includes('muối')) return 8000; // VND/kg
    if (name.includes('tiêu')) return 180000; // VND/kg
    if (name.includes('quế') || name.includes('hồi')) return 250000; // VND/kg
    if (name.includes('giấm')) return 35000; // VND/lít
    
    // Đồ uống (VND/lon hoặc lít)
    if (name.includes('coca cola')) return 12000; // VND/lon 330ml
    if (name.includes('pepsi')) return 12000;
    if (name.includes('mirinda')) return 12000;
    if (name.includes('trà sữa')) return 25000; // VND/ly
    if (name.includes('sữa tươi')) return 28000; // VND/lít
    if (name.includes('nước suối')) return 8000; // VND/chai
    
    // Khác
    if (name.includes('trứng gà')) return 3500; // VND/quả
    if (name.includes('trứng vịt')) return 4000; // VND/quả
    if (name.includes('đậu hũ')) return 25000; // VND/kg
    if (name.includes('mộc nhĩ')) return 180000; // VND/kg khô
    
    return 15000; // default cho nguyên liệu không xác định
}

// Số lượng nguyên liệu thực tế cho 1 phần ăn
function estimateQuantity(ingredientName, menuItemName) {
    const name = ingredientName.toLowerCase();
    const menuName = menuItemName.toLowerCase();
    
    // Thịt chính cho các món
    if (name.includes('thịt bò') || name.includes('bắp bò')) {
        if (menuName.includes('phở')) return 0.12; // 120g thịt bò phở
        if (menuName.includes('bún bò')) return 0.15; // 150g
        if (menuName.includes('cơm')) return 0.18; // 180g cơm thịt
        return 0.1; // 100g default
    }
    
    if (name.includes('thịt heo') || name.includes('thịt lợn')) {
        if (menuName.includes('bún')) return 0.1; // 100g
        if (menuName.includes('cơm')) return 0.15; // 150g
        return 0.08; // 80g default
    }
    
    if (name.includes('sườn')) {
        if (menuName.includes('cơm sườn')) return 0.2; // 200g sườn
        return 0.15; // 150g default
    }
    
    // Hải sản
    if (name.includes('cá')) {
        if (menuName.includes('cá kho')) return 0.25; // 250g
        if (menuName.includes('canh chua')) return 0.15; // 150g
        return 0.12; // 120g default
    }
    
    if (name.includes('tôm')) return 0.08; // 80g tôm
    if (name.includes('cua')) return 0.1; // 100g cua
    
    // Carbohydrate chính
    if (name.includes('bánh phở')) return 0.08; // 80g bánh phở khô
    if (name.includes('bún')) return 0.1; // 100g bún tươi
    if (name.includes('cơm')) return 0.12; // 120g cơm (từ 60g gạo)
    if (name.includes('miến')) return 0.06; // 60g miến khô
    
    // Rau củ
    if (name.includes('rau xà lách') || name.includes('rau sống')) return 0.05; // 50g
    if (name.includes('rau mùi') || name.includes('rau thơm')) return 0.01; // 10g
    if (name.includes('hành lá')) return 0.015; // 15g
    if (name.includes('cà chua')) return 0.03; // 30g
    if (name.includes('dưa leo')) return 0.02; // 20g
    
    // Gia vị (số lượng nhỏ)
    if (name.includes('nước mắm')) return 0.015; // 15ml
    if (name.includes('dầu ăn')) return 0.01; // 10ml
    if (name.includes('đường')) return 0.008; // 8g
    if (name.includes('muối')) return 0.003; // 3g
    if (name.includes('tiêu')) return 0.001; // 1g
    if (name.includes('quế') || name.includes('hồi')) return 0.002; // 2g
    
    // Đồ uống
    if (name.includes('coca') || name.includes('pepsi') || name.includes('mirinda')) return 1; // 1 lon
    if (name.includes('trà sữa')) return 1; // 1 ly
    if (name.includes('nước suối')) return 1; // 1 chai
    
    // Khác
    if (name.includes('trứng')) return 1; // 1 quả
    if (name.includes('đậu hũ')) return 0.05; // 50g
    
    return 0.02; // 20g default cho gia vị nhỏ
}

// Mức tồn kho tối thiểu thực tế
function estimateMinStock(ingredientName) {
    const name = ingredientName.toLowerCase();
    
    // Thịt cá (kg) - cần bảo quản lạnh
    if (name.includes('thịt') || name.includes('cá') || name.includes('tôm')) return 3; // 3kg
    
    // Rau củ (kg) - hỏng nhanh
    if (name.includes('rau') || name.includes('cà chua') || name.includes('dưa leo')) return 1; // 1kg
    
    // Đồ khô (kg) - bảo quản lâu
    if (name.includes('bún') || name.includes('phở') || name.includes('miến')) return 5; // 5kg
    if (name.includes('cơm') || name.includes('gạo')) return 10; // 10kg
    
    // Gia vị (kg/lít) - dùng ít
    if (name.includes('nước mắm') || name.includes('dầu ăn')) return 2; // 2 lít
    if (name.includes('đường') || name.includes('muối')) return 2; // 2kg
    if (name.includes('tiêu') || name.includes('quế')) return 0.2; // 200g
    
    // Đồ uống (lon/chai)
    if (name.includes('coca') || name.includes('pepsi') || name.includes('mirinda')) return 24; // 1 thùng
    if (name.includes('nước suối')) return 12; // 12 chai
    
    // Khác
    if (name.includes('trứng')) return 30; // 30 quả (1 vỉ)
    
    return 2; // default 2 đơn vị
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
