// controllers/menuItemRecipe.controller.js - XỬ LÝ ARRAY
const MenuItemRecipe = require('../models/menuItemRecipe.model');
const Inventory = require('../models/inventory.model');
const MenuItem = require('../models/menuItems.model');

// ✅ Lấy định lượng của món ăn
const getRecipe = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        
        const recipe = await MenuItemRecipe.findOne({ menu_item_id: menuItemId })
            .populate('ingredients.inventory_id', 'name unit currentstock')
            .populate('menu_item_id', 'name price');
        
        res.json({
            success: true,
            data: recipe ? recipe.ingredients : [] // ✅ TRẢ VỀ ARRAY INGREDIENTS
        });
    } catch (error) {
        console.error('Get recipe error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy định lượng' 
        });
    }
};

// ✅ Thiết lập định lượng cho món ăn - CẬP NHẬT ARRAY
const setRecipe = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const { ingredients } = req.body;
        
        console.log('Setting recipe for menuItemId:', menuItemId);
        console.log('Ingredients received:', ingredients);
        
        // Validate ingredients
        const processedIngredients = [];
        for (const ingredient of ingredients) {
            const inventory = await Inventory.findById(ingredient.inventory_id);
            if (!inventory) {
                return res.status(400).json({
                    success: false,
                    message: `Không tìm thấy nguyên liệu với ID: ${ingredient.inventory_id}`
                });
            }
            
            processedIngredients.push({
                inventory_id: ingredient.inventory_id,
                quantity_needed: ingredient.quantity_needed,
                unit: ingredient.unit || inventory.unit
            });
        }
        
        // ✅ TÌM VÀ CẬP NHẬT HOẶC TẠO MỚI
        const recipe = await MenuItemRecipe.findOneAndUpdate(
            { menu_item_id: menuItemId },
            { 
                menu_item_id: menuItemId,
                ingredients: processedIngredients, // ✅ CẬP NHẬT TOÀN BỘ ARRAY
                updated_at: new Date()
            },
            { 
                upsert: true, // Tạo mới nếu chưa có
                new: true,    // Trả về document sau khi update
                runValidators: true
            }
        ).populate('ingredients.inventory_id', 'name unit');
        
        res.json({
            success: true,
            data: recipe,
            message: 'Cập nhật định lượng thành công'
        });
    } catch (error) {
        console.error('Set recipe error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật định lượng: ' + error.message 
        });
    }
};

// ✅ Kiểm tra món ăn có thể chế biến
const checkAvailability = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const { quantity = 1 } = req.query;
        
        const recipe = await MenuItemRecipe.findOne({ menu_item_id: menuItemId })
            .populate('ingredients.inventory_id', 'name currentstock unit');
        
        if (!recipe || recipe.ingredients.length === 0) {
            return res.json({
                success: true,
                can_prepare: false,
                message: 'Món ăn chưa có định lượng',
                availability: []
            });
        }
        
        const availability = [];
        let canPrepare = true;
        
        for (const ingredient of recipe.ingredients) {
            const needed = ingredient.quantity_needed * quantity;
            const available = ingredient.inventory_id.currentstock;
            const sufficient = available >= needed;
            
            if (!sufficient) canPrepare = false;
            
            availability.push({
                ingredient_name: ingredient.inventory_id.name,
                needed_quantity: needed,
                available_quantity: available,
                sufficient,
                unit: ingredient.unit
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

// ✅ Lấy tất cả recipes
const getAllRecipes = async (req, res) => {
    try {
        const recipes = await MenuItemRecipe.find({})
            .populate('menu_item_id', 'name')
            .populate('ingredients.inventory_id', 'name');
        
        res.json({
            success: true,
            data: recipes
        });
    } catch (error) {
        console.error('Get all recipes error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách định lượng'
        });
    }
};

module.exports = {
    getRecipe,
    setRecipe,
    checkAvailability,
    getAllRecipes
};
