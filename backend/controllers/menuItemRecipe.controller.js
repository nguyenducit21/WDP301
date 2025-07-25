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

// ✅ CHỨC NĂNG MỚI: Kiểm tra từ tồn kho hiện có có thể nấu món ăn nào
const getAvailableMenuItems = async (req, res) => {
    try {
        const { includeUnavailable = false, includeInactive = false, autoSync = false } = req.query;

        console.log('=== DEBUG getAvailableMenuItems ===');
        console.log('includeUnavailable:', includeUnavailable);
        console.log('includeInactive:', includeInactive);

        // Lấy tất cả recipes - không filter menu item ở đây
        const recipes = await MenuItemRecipe.find({})
            .populate({
                path: 'menu_item_id',
                select: 'name price category is_available is_deleted image' // Sửa field names
            })
            .populate('ingredients.inventory_id', 'name currentstock unit minstocklevel isactive');

        console.log('Total recipes found:', recipes.length);

        // Lọc recipes theo điều kiện
        let filteredRecipes = recipes.filter(recipe => {
            // Bỏ qua recipe không có menu_item_id (bị xóa hoàn toàn)
            if (!recipe.menu_item_id) return false;

            // Bỏ qua món bị xóa
            if (recipe.menu_item_id.is_deleted) return false;

            // Nếu không bao gồm inactive, chỉ lấy menu item available
            if (includeInactive !== 'true' && !recipe.menu_item_id.is_available) {
                return false;
            }

            return true;
        });

        console.log('Filtered recipes:', filteredRecipes.length);
        console.log('Breakdown:');
        console.log('- Available menu items:', filteredRecipes.filter(r => r.menu_item_id.is_available).length);
        console.log('- Unavailable menu items:', filteredRecipes.filter(r => !r.menu_item_id.is_available).length);
        console.log('- Deleted menu items (should be 0):', filteredRecipes.filter(r => r.menu_item_id.is_deleted).length);

        const availableMenuItems = [];
        const syncUpdates = [];

        for (const recipe of filteredRecipes) {
            let canPrepare = true;
            let maxServings = Infinity;
            const ingredientStatus = [];
            let missingIngredients = [];

            console.log(`\n--- Processing recipe: ${recipe.menu_item_id.name} (Available: ${recipe.menu_item_id.is_available}) ---`);
            console.log('Ingredients count:', recipe.ingredients.length);

            // Kiểm tra từng nguyên liệu trong công thức
            for (const ingredient of recipe.ingredients) {
                const inventory = ingredient.inventory_id;

                // Kiểm tra inventory có tồn tại và active không
                if (!inventory || !inventory.isactive) {
                    console.log(`Ingredient ${inventory?.name || 'UNKNOWN'} is inactive or missing`);
                    canPrepare = false;
                    missingIngredients.push({
                        name: inventory?.name || 'Nguyên liệu không tồn tại',
                        needed: ingredient.quantity_needed,
                        available: 0,
                        shortage: ingredient.quantity_needed,
                        unit: ingredient.unit,
                        reason: 'Nguyên liệu không hoạt động'
                    });
                    continue;
                }

                const neededQuantity = ingredient.quantity_needed;
                const availableStock = inventory.currentstock || 0;

                console.log(`Ingredient: ${inventory.name}`);
                console.log(`  - Needed: ${neededQuantity} ${ingredient.unit}`);
                console.log(`  - Available: ${availableStock} ${inventory.unit}`);

                // Tính số suất có thể làm từ nguyên liệu này
                const possibleServings = neededQuantity > 0 ? Math.floor(availableStock / neededQuantity) : 0;

                const isInsufficient = availableStock < neededQuantity;
                const isLowStock = availableStock <= inventory.minstocklevel;

                if (isInsufficient) {
                    canPrepare = false;
                    missingIngredients.push({
                        name: inventory.name,
                        needed: neededQuantity,
                        available: availableStock,
                        shortage: neededQuantity - availableStock,
                        unit: ingredient.unit,
                        reason: 'Không đủ số lượng'
                    });
                }

                // Cập nhật số suất tối đa có thể làm
                if (possibleServings < maxServings) {
                    maxServings = possibleServings;
                }

                ingredientStatus.push({
                    ingredient_name: inventory.name,
                    needed_quantity: neededQuantity,
                    available_quantity: availableStock,
                    possible_servings: possibleServings,
                    sufficient: !isInsufficient,
                    low_stock: isLowStock,
                    unit: ingredient.unit
                });
            }

            // Xử lý trường hợp maxServings = Infinity (không có nguyên liệu nào)
            if (maxServings === Infinity) {
                maxServings = 0;
            }

            console.log(`Can prepare: ${canPrepare}, Max servings: ${maxServings}`);

            // ✅ AUTO SYNC: Kiểm tra xem cần cập nhật is_available không
            const currentAvailable = recipe.menu_item_id.is_available;
            const shouldBeAvailable = canPrepare;

            if (autoSync === 'true' && currentAvailable !== shouldBeAvailable) {
                syncUpdates.push({
                    menu_item_id: recipe.menu_item_id._id,
                    menu_item_name: recipe.menu_item_id.name,
                    old_status: currentAvailable,
                    new_status: shouldBeAvailable,
                    reason: canPrepare ? 'Đủ nguyên liệu' : 'Thiếu nguyên liệu'
                });

                // Cập nhật is_available trong recipe object để hiển thị đúng
                recipe.menu_item_id.is_available = shouldBeAvailable;
            }

            // Nếu menu item không available, không thể chế biến
            if (!recipe.menu_item_id.is_available) {
                canPrepare = false;
                if (missingIngredients.length === 0) {
                    missingIngredients.push({
                        name: 'Món ăn',
                        needed: 1,
                        available: 0,
                        shortage: 1,
                        unit: 'món',
                        reason: 'Món ăn đã bị tạm ngưng phục vụ'
                    });
                }
            }

            console.log(`Can prepare: ${canPrepare}, Max servings: ${maxServings}`);

            const menuItemInfo = {
                menu_item_id: recipe.menu_item_id._id,
                menu_item_name: recipe.menu_item_id.name,
                menu_item_price: recipe.menu_item_id.price,
                menu_item_category: recipe.menu_item_id.category,
                menu_item_image: recipe.menu_item_id.image,
                menu_item_active: recipe.menu_item_id.is_available, // Thêm thông tin available
                can_prepare: canPrepare,
                max_servings: maxServings,
                ingredient_count: recipe.ingredients.length,
                ingredients_status: ingredientStatus,
                missing_ingredients: missingIngredients,
                status: canPrepare ? 'available' : 'unavailable',
                warning: missingIngredients.length > 0 ? `Thiếu ${missingIngredients.length} yếu tố` : null
            };

            // Thêm vào danh sách dựa trên filter
            if (canPrepare || includeUnavailable === 'true') {
                availableMenuItems.push(menuItemInfo);
            }
        }

        // ✅ THỰC HIỆN AUTO SYNC nếu có
        if (autoSync === 'true' && syncUpdates.length > 0) {
            console.log(`\n=== AUTO SYNC: Updating ${syncUpdates.length} menu items ===`);

            for (const update of syncUpdates) {
                try {
                    await MenuItem.findByIdAndUpdate(
                        update.menu_item_id,
                        {
                            is_available: update.new_status,
                            updated_at: new Date()
                        }
                    );
                    console.log(`Synced ${update.menu_item_name}: ${update.old_status} → ${update.new_status}`);
                } catch (syncError) {
                    console.error(`Failed to sync ${update.menu_item_name}:`, syncError);
                }
            }
        }

        // Sắp xếp: món có thể nấu lên trước, sau đó theo tên
        availableMenuItems.sort((a, b) => {
            if (a.can_prepare && !b.can_prepare) return -1;
            if (!a.can_prepare && b.can_prepare) return 1;
            if (a.can_prepare && b.can_prepare) {
                // Ưu tiên món có thể nấu nhiều suất hơn
                if (b.max_servings !== a.max_servings) {
                    return b.max_servings - a.max_servings;
                }
            }
            return a.menu_item_name.localeCompare(b.menu_item_name);
        });

        // Thống kê tổng quan
        const availableCount = availableMenuItems.filter(item => item.can_prepare).length;
        const unavailableCount = availableMenuItems.filter(item => !item.can_prepare).length;
        const totalRecipes = filteredRecipes.length;
        const inactiveMenuItems = filteredRecipes.filter(r => !r.menu_item_id.is_available).length;

        console.log('=== FINAL RESULT ===');
        console.log('Total filtered recipes:', totalRecipes);
        console.log('Available items:', availableCount);
        console.log('Unavailable items:', unavailableCount);
        console.log('Inactive menu items:', inactiveMenuItems);
        console.log('Items returned:', availableMenuItems.length);

        res.json({
            success: true,
            data: availableMenuItems,
            summary: {
                total_menu_items: totalRecipes,
                available_items: availableCount,
                unavailable_items: unavailableCount,
                inactive_menu_items: inactiveMenuItems,
                availability_rate: totalRecipes > 0 ? Math.round((availableCount / totalRecipes) * 100) : 0,
                synced_items: syncUpdates.length // Thêm thông tin sync
            },
            sync_updates: syncUpdates, // Chi tiết các món được sync
            message: `Có ${availableCount}/${totalRecipes} món ăn có thể chế biến từ nguyên liệu hiện có${inactiveMenuItems > 0 ? ` (${inactiveMenuItems} món đang tạm ngưng)` : ''}${syncUpdates.length > 0 ? ` - Đã sync ${syncUpdates.length} món` : ''}`
        });

    } catch (error) {
        console.error('Get available menu items error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra món ăn có thể chế biến: ' + error.message
        });
    }
};

// ✅ DEBUG: Kiểm tra dữ liệu cơ bản
const debugData = async (req, res) => {
    try {
        // Đếm tổng số records
        const totalRecipes = await MenuItemRecipe.countDocuments();
        const totalMenuItems = await MenuItem.countDocuments();
        const activeMenuItems = await MenuItem.countDocuments({ is_available: true, is_deleted: false });
        const totalInventory = await Inventory.countDocuments();
        const activeInventory = await Inventory.countDocuments({ isactive: true });

        // Lấy vài sample data
        const sampleRecipes = await MenuItemRecipe.find({})
            .populate('menu_item_id', 'name is_available is_deleted')
            .populate('ingredients.inventory_id', 'name currentstock')
            .limit(3);

        const sampleMenuItems = await MenuItem.find({ is_available: true, is_deleted: false })
            .select('name is_available is_deleted category')
            .limit(5);

        const sampleInventory = await Inventory.find({ isactive: true })
            .select('name currentstock unit')
            .limit(5);

        res.json({
            success: true,
            data: {
                counts: {
                    total_recipes: totalRecipes,
                    total_menu_items: totalMenuItems,
                    active_menu_items: activeMenuItems,
                    total_inventory: totalInventory,
                    active_inventory: activeInventory
                },
                samples: {
                    recipes: sampleRecipes.map(recipe => ({
                        _id: recipe._id,
                        menu_item_name: recipe.menu_item_id ? recipe.menu_item_id.name : 'NULL',
                        menu_item_available: recipe.menu_item_id ? recipe.menu_item_id.is_available : false,
                        menu_item_deleted: recipe.menu_item_id ? recipe.menu_item_id.is_deleted : false,
                        ingredients_count: recipe.ingredients.length,
                        first_ingredient: recipe.ingredients[0] ? {
                            name: recipe.ingredients[0].inventory_id?.name || 'NULL',
                            needed: recipe.ingredients[0].quantity_needed,
                            available: recipe.ingredients[0].inventory_id?.currentstock || 0
                        } : null
                    })),
                    menu_items: sampleMenuItems,
                    inventory: sampleInventory
                }
            }
        });
    } catch (error) {
        console.error('Debug data error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi debug dữ liệu: ' + error.message
        });
    }
};
// ✅ ĐỒNG BỘ TRẠNG THÁI AVAILABLE CỦA MENU ITEM
const syncMenuItemAvailability = async (req, res) => {
    try {
        console.log('=== SYNCING MENU ITEM AVAILABILITY ===');

        // Lấy tất cả recipes
        const recipes = await MenuItemRecipe.find({})
            .populate({
                path: 'menu_item_id',
                select: 'name is_available is_deleted'
            })
            .populate('ingredients.inventory_id', 'name currentstock unit isactive');

        const updateResults = [];
        let updatedCount = 0;

        for (const recipe of recipes) {
            // Bỏ qua recipe không có menu_item_id hoặc bị xóa
            if (!recipe.menu_item_id || recipe.menu_item_id.is_deleted) {
                continue;
            }

            let canPrepare = true;

            // Kiểm tra từng nguyên liệu
            for (const ingredient of recipe.ingredients) {
                const inventory = ingredient.inventory_id;

                // Kiểm tra inventory có tồn tại và active không
                if (!inventory || !inventory.isactive) {
                    canPrepare = false;
                    break;
                }

                const neededQuantity = ingredient.quantity_needed;
                const availableStock = inventory.currentstock || 0;

                // Nếu không đủ nguyên liệu
                if (availableStock < neededQuantity) {
                    canPrepare = false;
                    break;
                }
            }

            const currentAvailable = recipe.menu_item_id.is_available;
            const shouldBeAvailable = canPrepare;

            // Chỉ cập nhật nếu trạng thái thay đổi
            if (currentAvailable !== shouldBeAvailable) {
                try {
                    await MenuItem.findByIdAndUpdate(
                        recipe.menu_item_id._id,
                        {
                            is_available: shouldBeAvailable,
                            updated_at: new Date()
                        }
                    );

                    updateResults.push({
                        menu_item_id: recipe.menu_item_id._id,
                        menu_item_name: recipe.menu_item_id.name,
                        old_status: currentAvailable,
                        new_status: shouldBeAvailable,
                        reason: canPrepare ? 'Đủ nguyên liệu' : 'Thiếu nguyên liệu'
                    });

                    updatedCount++;
                    console.log(`Updated ${recipe.menu_item_id.name}: ${currentAvailable} → ${shouldBeAvailable}`);
                } catch (updateError) {
                    console.error(`Failed to update ${recipe.menu_item_id.name}:`, updateError);
                }
            }
        }

        console.log(`=== SYNC COMPLETE: ${updatedCount} items updated ===`);

        res.json({
            success: true,
            data: {
                total_recipes_checked: recipes.length,
                items_updated: updatedCount,
                update_details: updateResults
            },
            message: `Đã đồng bộ ${updatedCount} món ăn dựa trên tình trạng nguyên liệu`
        });

    } catch (error) {
        console.error('Sync menu item availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đồng bộ trạng thái món ăn: ' + error.message
        });
    }
};

// ✅ TRỪ NGUYÊN LIỆU KHI CÓ ĐƠN HÀNG
const consumeIngredients = async (orderItems, orderType = 'order', orderId = null) => {
    try {
        console.log(`=== CONSUMING INGREDIENTS for ${orderType} ${orderId} ===`);

        const consumptionResults = [];
        const insufficientItems = [];

        // Kiểm tra tất cả nguyên liệu trước khi trừ
        for (const item of orderItems) {
            const recipe = await MenuItemRecipe.findOne({ menu_item_id: item.menu_item_id })
                .populate('ingredients.inventory_id', 'name currentstock unit isactive');

            if (!recipe || !recipe.ingredients.length) {
                console.log(`No recipe found for menu_item_id: ${item.menu_item_id}`);
                continue;
            }

            // Kiểm tra từng nguyên liệu
            for (const ingredient of recipe.ingredients) {
                const inventory = ingredient.inventory_id;

                if (!inventory || !inventory.isactive) {
                    insufficientItems.push({
                        menu_item_id: item.menu_item_id,
                        ingredient_name: inventory?.name || 'Unknown',
                        reason: 'Nguyên liệu không hoạt động'
                    });
                    continue;
                }

                const neededQuantity = ingredient.quantity_needed * item.quantity;
                const availableStock = inventory.currentstock || 0;

                if (availableStock < neededQuantity) {
                    insufficientItems.push({
                        menu_item_id: item.menu_item_id,
                        ingredient_name: inventory.name,
                        needed: neededQuantity,
                        available: availableStock,
                        shortage: neededQuantity - availableStock,
                        unit: ingredient.unit
                    });
                }
            }
        }

        // Nếu có nguyên liệu không đủ, trả về cảnh báo nhưng vẫn tiếp tục xử lý
        if (insufficientItems.length > 0) {
            console.log('⚠️ Some ingredients are insufficient:', insufficientItems);
        }

        // Thực hiện trừ nguyên liệu
        for (const item of orderItems) {
            const recipe = await MenuItemRecipe.findOne({ menu_item_id: item.menu_item_id })
                .populate('ingredients.inventory_id', 'name currentstock unit isactive');

            if (!recipe || !recipe.ingredients.length) {
                continue;
            }

            for (const ingredient of recipe.ingredients) {
                const inventory = ingredient.inventory_id;

                if (!inventory || !inventory.isactive) {
                    continue;
                }

                const neededQuantity = ingredient.quantity_needed * item.quantity;
                const availableStock = inventory.currentstock || 0;

                // Trừ nguyên liệu (cho phép âm nếu không đủ)
                const newStock = Math.max(0, availableStock - neededQuantity);

                await Inventory.findByIdAndUpdate(
                    inventory._id,
                    {
                        currentstock: newStock,
                        updated_at: new Date()
                    }
                );

                consumptionResults.push({
                    inventory_id: inventory._id,
                    inventory_name: inventory.name,
                    menu_item_id: item.menu_item_id,
                    quantity_consumed: Math.min(neededQuantity, availableStock),
                    quantity_needed: neededQuantity,
                    stock_before: availableStock,
                    stock_after: newStock,
                    unit: ingredient.unit
                });

                console.log(`✅ Consumed ${Math.min(neededQuantity, availableStock)} ${ingredient.unit} of ${inventory.name} (${availableStock} → ${newStock})`);
            }
        }

        return {
            success: true,
            consumptionResults,
            insufficientItems,
            hasInsufficient: insufficientItems.length > 0
        };

    } catch (error) {
        console.error('Error consuming ingredients:', error);
        return {
            success: false,
            error: error.message,
            consumptionResults: [],
            insufficientItems: []
        };
    }
};

// ✅ HOÀN TRẢ NGUYÊN LIỆU KHI HỦY ĐƠN HÀNG
const restoreIngredients = async (orderItems, orderType = 'order', orderId = null) => {
    try {
        console.log(`=== RESTORING INGREDIENTS for ${orderType} ${orderId} ===`);

        const restorationResults = [];

        for (const item of orderItems) {
            const recipe = await MenuItemRecipe.findOne({ menu_item_id: item.menu_item_id })
                .populate('ingredients.inventory_id', 'name currentstock unit isactive');

            if (!recipe || !recipe.ingredients.length) {
                continue;
            }

            for (const ingredient of recipe.ingredients) {
                const inventory = ingredient.inventory_id;

                if (!inventory || !inventory.isactive) {
                    continue;
                }

                const restoredQuantity = ingredient.quantity_needed * item.quantity;
                const currentStock = inventory.currentstock || 0;
                const newStock = currentStock + restoredQuantity;

                await Inventory.findByIdAndUpdate(
                    inventory._id,
                    {
                        currentstock: newStock,
                        updated_at: new Date()
                    }
                );

                restorationResults.push({
                    inventory_id: inventory._id,
                    inventory_name: inventory.name,
                    menu_item_id: item.menu_item_id,
                    quantity_restored: restoredQuantity,
                    stock_before: currentStock,
                    stock_after: newStock,
                    unit: ingredient.unit
                });

                console.log(`🔄 Restored ${restoredQuantity} ${ingredient.unit} of ${inventory.name} (${currentStock} → ${newStock})`);
            }
        }

        return {
            success: true,
            restorationResults
        };

    } catch (error) {
        console.error('Error restoring ingredients:', error);
        return {
            success: false,
            error: error.message,
            restorationResults: []
        };
    }
};

// ✅ CẬP NHẬT THAY ĐỔI NGUYÊN LIỆU KHI SỬA ĐƠN HÀNG
const updateIngredientConsumption = async (oldItems, newItems, orderType = 'order', orderId = null) => {
    try {
        console.log(`=== UPDATING INGREDIENT CONSUMPTION for ${orderType} ${orderId} ===`);

        // Tính toán sự khác biệt
        const oldItemsMap = {};
        const newItemsMap = {};

        // Map old items
        oldItems.forEach(item => {
            const key = item.menu_item_id.toString();
            oldItemsMap[key] = (oldItemsMap[key] || 0) + item.quantity;
        });

        // Map new items  
        newItems.forEach(item => {
            const key = item.menu_item_id.toString();
            newItemsMap[key] = (newItemsMap[key] || 0) + item.quantity;
        });

        // Tìm items cần trừ thêm (tăng số lượng)
        const itemsToConsume = [];
        // Tìm items cần hoàn trả (giảm số lượng)
        const itemsToRestore = [];

        // Xử lý tất cả menu items
        const allMenuItemIds = new Set([...Object.keys(oldItemsMap), ...Object.keys(newItemsMap)]);

        for (const menuItemId of allMenuItemIds) {
            const oldQuantity = oldItemsMap[menuItemId] || 0;
            const newQuantity = newItemsMap[menuItemId] || 0;
            const difference = newQuantity - oldQuantity;

            if (difference > 0) {
                // Tăng số lượng -> cần trừ thêm nguyên liệu
                itemsToConsume.push({
                    menu_item_id: menuItemId,
                    quantity: difference
                });
            } else if (difference < 0) {
                // Giảm số lượng -> cần hoàn trả nguyên liệu
                itemsToRestore.push({
                    menu_item_id: menuItemId,
                    quantity: Math.abs(difference)
                });
            }
        }

        const results = [];

        // Trừ nguyên liệu cho items tăng
        if (itemsToConsume.length > 0) {
            const consumeResult = await consumeIngredients(itemsToConsume, orderType, orderId);
            results.push({ type: 'consume', ...consumeResult });
        }

        // Hoàn trả nguyên liệu cho items giảm
        if (itemsToRestore.length > 0) {
            const restoreResult = await restoreIngredients(itemsToRestore, orderType, orderId);
            results.push({ type: 'restore', ...restoreResult });
        }

        return {
            success: true,
            results,
            itemsToConsume,
            itemsToRestore
        };

    } catch (error) {
        console.error('Error updating ingredient consumption:', error);
        return {
            success: false,
            error: error.message,
            results: []
        };
    }
};

// ✅ TEST ĐỒNG BỘ NGUYÊN LIỆU
const testIngredientSync = async (req, res) => {
    try {
        const { action, orderItems, orderId, orderType } = req.body;

        if (!action || !orderItems || !Array.isArray(orderItems)) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin: action, orderItems (array)'
            });
        }

        let result = {};

        switch (action) {
            case 'consume':
                result = await consumeIngredients(orderItems, orderType || 'test', orderId || 'test-order');
                break;

            case 'restore':
                result = await restoreIngredients(orderItems, orderType || 'test', orderId || 'test-order');
                break;

            case 'update':
                const { oldItems, newItems } = req.body;
                if (!oldItems || !newItems) {
                    return res.status(400).json({
                        success: false,
                        message: 'Thiếu oldItems hoặc newItems cho action update'
                    });
                }
                result = await updateIngredientConsumption(oldItems, newItems, orderType || 'test', orderId || 'test-order');
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Action không hợp lệ. Sử dụng: consume, restore, hoặc update'
                });
        }

        res.json({
            success: true,
            action,
            data: result,
            message: `Test ${action} thành công`
        });

    } catch (error) {
        console.error('Test ingredient sync error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi test đồng bộ nguyên liệu: ' + error.message
        });
    }
};

module.exports = {
    getRecipe,
    setRecipe,
    checkAvailability,
    getAllRecipes,
    getAvailableMenuItems,  // ✅ Export function mới
    debugData,  // ✅ Export function debug
    syncMenuItemAvailability,  // ✅ Export function sync
    consumeIngredients,  // ✅ Export function tiêu thụ nguyên liệu
    restoreIngredients,  // ✅ Export function hoàn trả nguyên liệu
    updateIngredientConsumption,  // ✅ Export function cập nhật thay đổi
    testIngredientSync  // ✅ Export function test
};