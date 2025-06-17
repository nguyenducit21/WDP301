// controllers/menuItemRecipe.controller.js
const MenuItemRecipe = require('../models/menuItemRecipe.model');
const Inventory = require('../models/inventory.model');
const MenuItem = require('../models/menuItems.model');

// Lấy công thức của món ăn
const getRecipe = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        
        const recipes = await MenuItemRecipe.find({ menu_item_id: menuItemId })
            .populate('inventory_id', 'name unit cost_per_unit current_stock category')
            .populate('menu_item_id', 'name price');
        
        res.json({
            success: true,
            data: recipes
        });
    } catch (error) {
        console.error('Get recipe error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy công thức' 
        });
    }
};

// Thiết lập công thức cho món ăn
const setRecipe = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const { ingredients } = req.body;
        
        // Xóa công thức cũ
        await MenuItemRecipe.deleteMany({ menu_item_id: menuItemId });
        
        let totalCost = 0;
        const newRecipes = [];
        
        for (const ingredient of ingredients) {
            const inventory = await Inventory.findById(ingredient.inventory_id);
            if (!inventory) {
                return res.status(400).json({
                    success: false,
                    message: `Không tìm thấy nguyên liệu với ID: ${ingredient.inventory_id}`
                });
            }
            
            const costPerServing = ingredient.quantity_needed * inventory.cost_per_unit;
            totalCost += costPerServing;
            
            const recipe = new MenuItemRecipe({
                menu_item_id: menuItemId,
                inventory_id: ingredient.inventory_id,
                quantity_needed: ingredient.quantity_needed,
                unit: ingredient.unit || inventory.unit,
                cost_per_serving: costPerServing,
                is_main_ingredient: ingredient.is_main_ingredient || false
            });
            
            await recipe.save();
            newRecipes.push(recipe);
        }
        
        // Cập nhật chi phí cho món ăn
        const menuItem = await MenuItem.findById(menuItemId);
        if (menuItem) {
            const foodCostPercentage = menuItem.price > 0 ? (totalCost / menuItem.price * 100) : 0;
            
            await MenuItem.findByIdAndUpdate(menuItemId, {
                total_ingredient_cost: totalCost,
                food_cost_percentage: foodCostPercentage,
                updated_at: new Date()
            });
        }
        
        res.json({
            success: true,
            data: newRecipes,
            total_cost: totalCost,
            message: 'Cập nhật công thức thành công'
        });
    } catch (error) {
        console.error('Set recipe error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật công thức' 
        });
    }
};

// Kiểm tra món ăn có thể chế biến
const checkAvailability = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const { quantity = 1 } = req.query;
        
        const recipes = await MenuItemRecipe.find({ menu_item_id: menuItemId })
            .populate('inventory_id', 'name current_stock unit');
        
        if (recipes.length === 0) {
            return res.json({
                success: true,
                can_prepare: false,
                message: 'Món ăn chưa có công thức',
                availability: []
            });
        }
        
        const availability = [];
        let canPrepare = true;
        
        for (const recipe of recipes) {
            const needed = recipe.quantity_needed * quantity;
            const available = recipe.inventory_id.current_stock;
            const sufficient = available >= needed;
            
            if (!sufficient) canPrepare = false;
            
            availability.push({
                ingredient_name: recipe.inventory_id.name,
                needed_quantity: needed,
                available_quantity: available,
                sufficient,
                unit: recipe.unit
            });
        }
        
        res.json({
            success: true,
            can_prepare: canPrepare,
            availability,
            message: canPrepare ? 'Có thể chế biến' : 'Không đủ nguyên liệu'
        });
    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi kiểm tra tình trạng' 
        });
    }
};

module.exports = {
    getRecipe,
    setRecipe,
    checkAvailability
};
