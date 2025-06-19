// scripts/create-recipes.js
require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../models/menuItems.model');
const Inventory = require('../models/inventory.model');
const MenuItemRecipe = require('../models/menuItemRecipe.model');

// Công thức đã điều chỉnh phù hợp với nguyên liệu có sẵn
const simpleRecipes = {
    "Phở bò": [
        { name: "Thịt bò", quantity: 0.12, unit: "kg", is_main: true },
        { name: "Bánh phở", quantity: 0.08, unit: "kg", is_main: true },
        { name: "Hành lá", quantity: 0.02, unit: "kg", is_main: false },
        { name: "Nước mắm", quantity: 0.015, unit: "lít", is_main: false }
    ],
    
    "Cơm tấm sướn bì": [
        { name: "Sườn heo", quantity: 0.2, unit: "kg", is_main: true },
        { name: "Bì heo", quantity: 0.05, unit: "kg", is_main: true },
        { name: "Cơm", quantity: 0.15, unit: "kg", is_main: false },
        { name: "Dưa leo", quantity: 0.03, unit: "kg", is_main: false }
    ],
    
    "Bún chả": [
        { name: "Thịt heo", quantity: 0.15, unit: "kg", is_main: true },
        { name: "Bún", quantity: 0.1, unit: "kg", is_main: true },
        { name: "Rau sống", quantity: 0.05, unit: "kg", is_main: false },
        { name: "Nước mắm", quantity: 0.01, unit: "lít", is_main: false }
    ],
    
    "Chả giò": [
        { name: "Thịt heo", quantity: 0.1, unit: "kg", is_main: true },
        { name: "Bánh tráng", quantity: 0.05, unit: "kg", is_main: true },
        { name: "Rau sống", quantity: 0.03, unit: "kg", is_main: false }
    ],
    
    "Gỏi bắp bò": [
        { name: "Thịt bò", quantity: 0.15, unit: "kg", is_main: true }, // Sửa từ "Bắp bò" thành "Thịt bò"
        { name: "Rau thơm", quantity: 0.05, unit: "kg", is_main: true },
        { name: "Cà chua", quantity: 0.03, unit: "kg", is_main: false }, // Sửa từ "Hành tây"
        { name: "Nước mắm", quantity: 0.01, unit: "lít", is_main: false }
    ],
    
    "Trà sữa chân trâu": [
        { name: "Đường", quantity: 0.05, unit: "kg", is_main: true }, // Đơn giản hóa
        { name: "Dầu ăn", quantity: 0.02, unit: "lít", is_main: false } // Thay thế các nguyên liệu phức tạp
    ],
    
    "Cá kho tộ": [
        { name: "Cá", quantity: 0.25, unit: "kg", is_main: true },
        { name: "Nước mắm", quantity: 0.02, unit: "lít", is_main: false },
        { name: "Đường", quantity: 0.01, unit: "kg", is_main: false },
        { name: "Cà chua", quantity: 0.05, unit: "kg", is_main: false }
    ],
    
    "Salad cá ngừ": [
        { name: "Cá", quantity: 0.12, unit: "kg", is_main: true },
        { name: "Xà lách", quantity: 0.08, unit: "kg", is_main: true }, // Sửa từ "Rau xà lách"
        { name: "Cà chua", quantity: 0.05, unit: "kg", is_main: false },
        { name: "Dưa leo", quantity: 0.03, unit: "kg", is_main: false }
    ],
    
    "Súp cua": [
        { name: "Tôm", quantity: 0.1, unit: "kg", is_main: true }, // Thay "Cua" bằng "Tôm"
        { name: "Trứng", quantity: 1, unit: "cái", is_main: false },
        { name: "Nước mắm", quantity: 0.01, unit: "lít", is_main: false }
    ],
    
    "Chè đậu xanh": [
        { name: "Đường", quantity: 0.08, unit: "kg", is_main: true }, // Thay "Đậu xanh" bằng "Đường"
        { name: "Dầu ăn", quantity: 0.02, unit: "lít", is_main: false } // Đơn giản hóa
    ],
    
    "Sữa chua nếp cẩm": [
        { name: "Đường", quantity: 0.15, unit: "kg", is_main: true }, // Đơn giản hóa
        { name: "Dầu ăn", quantity: 0.05, unit: "lít", is_main: false }
    ],
    
    "Cơm cháy": [
        { name: "Cơm", quantity: 0.1, unit: "kg", is_main: true },
        { name: "Dầu ăn", quantity: 0.02, unit: "lít", is_main: false },
        { name: "Muối", quantity: 0.005, unit: "kg", is_main: false }
    ],
    
    "Mirinda": [
        { name: "Mirinda", quantity: 1, unit: "cái", is_main: true }
    ]
};

async function createRecipes() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    try {
        console.log('🍽️  Tạo công thức món ăn...');
        
        // Xóa tất cả recipes cũ
        await MenuItemRecipe.deleteMany({});
        console.log('🗑️  Đã xóa recipes cũ');
        
        let recipesCreated = 0;
        let menuItemsUpdated = 0;
        
        for (const [dishName, ingredients] of Object.entries(simpleRecipes)) {
            console.log(`\n🍽️  Xử lý món: ${dishName}`);
            
            // Tìm menu item (tìm kiếm linh hoạt)
            const menuItem = await MenuItem.findOne({ 
                name: { $regex: new RegExp(dishName, 'i') } 
            });
            
            if (!menuItem) {
                console.log(`❌ Không tìm thấy món: ${dishName}`);
                continue;
            }
            
            let totalCost = 0;
            let hasValidIngredients = false;
            
            for (const ingredient of ingredients) {
                // Tìm inventory (tìm kiếm linh hoạt)
                const inventory = await Inventory.findOne({ 
                    name: { $regex: new RegExp(`^${ingredient.name}$`, 'i') } 
                });
                
                if (!inventory) {
                    console.log(`  ⚠️  Không tìm thấy nguyên liệu: ${ingredient.name}`);
                    continue;
                }
                
                // Tạo recipe
                const costPerServing = ingredient.quantity * inventory.cost_per_unit;
                totalCost += costPerServing;
                hasValidIngredients = true;
                
                const recipe = new MenuItemRecipe({
                    menu_item_id: menuItem._id,
                    inventory_id: inventory._id,
                    quantity_needed: ingredient.quantity,
                    unit: ingredient.unit,
                    cost_per_serving: costPerServing,
                    is_main_ingredient: ingredient.is_main
                });
                
                await recipe.save();
                console.log(`    ✅ ${ingredient.name}: ${ingredient.quantity} ${ingredient.unit} - ${costPerServing.toLocaleString()} VND`);
                recipesCreated++;
            }
            
            // Cập nhật menu item cost nếu có nguyên liệu hợp lệ
            if (hasValidIngredients) {
                const foodCostPercentage = menuItem.price > 0 ? (totalCost / menuItem.price * 100) : 0;
                
                await MenuItem.findByIdAndUpdate(menuItem._id, {
                    total_ingredient_cost: Math.round(totalCost),
                    food_cost_percentage: Math.round(foodCostPercentage * 10) / 10,
                    updated_at: new Date()
                });
                
                console.log(`  💰 Tổng chi phí: ${totalCost.toLocaleString()} VND (${foodCostPercentage.toFixed(1)}%)`);
                menuItemsUpdated++;
            }
        }
        
        console.log('\n🎉 Hoàn thành tạo công thức!');
        console.log(`📋 Tạo ${recipesCreated} recipe records`);
        console.log(`🍽️  Cập nhật ${menuItemsUpdated} món ăn`);
        
        // Hiển thị summary
        console.log('\n📊 Tóm tắt:');
        const totalRecipes = await MenuItemRecipe.countDocuments();
        const itemsWithRecipes = await MenuItem.countDocuments({ total_ingredient_cost: { $gt: 0 } });
        console.log(`   - Tổng recipes: ${totalRecipes}`);
        console.log(`   - Món có công thức: ${itemsWithRecipes}`);
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Chạy script
if (require.main === module) {
    createRecipes();
}

module.exports = createRecipes;
