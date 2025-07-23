const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Reservation = require('../models/reservation.model');
const MenuItemRecipe = require('../models/menuItemRecipe.model');
const Inventory = require('../models/inventory.model');
const ImportReceipt = require('../models/importReceipt.model');

const getAllInventory = async (req, res) => {
    try {
        const { search, lowstock } = req.query;
        let filter = { isactive: true };

        if (search) filter.name = { $regex: search, $options: 'i' };

        let inventories = await Inventory.find(filter).sort({ name: 1 });

        if (lowstock === 'true') {
            inventories = inventories.filter(inv => inv.currentstock <= inv.minstocklevel);
        }

        res.json({
            success: true,
            data: inventories
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách nguyên liệu'
        });
    }
};

const getInventoryById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nguyên liệu không hợp lệ'
            });
        }

        const inventory = await Inventory.findById(id);
        if (!inventory || !inventory.isactive) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }

        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        console.error('Get inventory by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin nguyên liệu',
            error: error.message
        });
    }
};

const createInventory = async (req, res) => {
    try {
        const { name, unit, supplier, minstocklevel, storageType } = req.body;

        if (!name || !unit || !supplier) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (tên, đơn vị, nhà cung cấp)'
            });
        }

        if (storageType && !['perishable', 'semi-perishable', 'dry'].includes(storageType)) {
            return res.status(400).json({
                success: false,
                message: 'Loại bảo quản không hợp lệ'
            });
        }

        const existingInventory = await Inventory.findOne({ name, isactive: true });
        if (existingInventory) {
            return res.status(400).json({
                success: false,
                message: 'Tên nguyên liệu đã tồn tại'
            });
        }

        const inventory = new Inventory({
            name: name.trim(),
            unit,
            supplier: supplier.trim(),
            minstocklevel: Number(minstocklevel) || 10,
            costperunit: 0,
            currentstock: 0,
            storageType: storageType || 'perishable',
            createdat: new Date(),
            updatedat: new Date()
        });

        await inventory.save();

        res.status(201).json({
            success: true,
            data: inventory,
            message: 'Thêm nguyên liệu thành công. Hãy nhập hàng để có giá và số lượng.'
        });
    } catch (error) {
        console.error('Create inventory error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getInventoryHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        console.log(`getInventoryHistory: id=${id}, page=${page}, limit=${limit}`);

        if (!mongoose.isValidObjectId(id)) {
            console.error(`Invalid inventory ID: ${id}`);
            return res.status(400).json({
                success: false,
                message: 'ID nguyên liệu không hợp lệ'
            });
        }

        const collections = await mongoose.connection.db.listCollections({ name: 'inventories' }).toArray();
        if (!collections.length) {
            console.warn('Collection "inventories" does not exist');
            return res.status(404).json({
                success: false,
                message: 'Collection "inventories" not found'
            });
        }

        const inventory = await Inventory.findById(id).catch(err => {
            console.error('Error finding inventory:', err);
            return null;
        });
        if (!inventory || !inventory.isactive) {
            console.warn(`Inventory not found or inactive: id=${id}`);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu hoặc nguyên liệu đã bị xóa'
            });
        }

        const importReceipts = await ImportReceipt.find({
            'items.inventory_id': id
        })
            .populate('staff_id', 'full_name')
            .sort({ created_at: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .catch(err => {
                console.error('Error fetching import receipts:', err);
                return [];
            });

        const total = await ImportReceipt.countDocuments({
            'items.inventory_id': id
        }).catch(err => {
            console.error('Error counting import receipts:', err);
            return 0;
        });

        const historyData = importReceipts.map(receipt => {
            const item = receipt.items.find(
                item => item.inventory_id.toString() === id
            );

            if (!item) return null;

            return {
                _id: receipt._id,
                receipt_code: receipt.receipt_code,
                import_date: receipt.created_at,
                quantity_imported: item.quantity,
                unit_price: item.unit_price,
                supplier: item.supplier,
                total_cost: item.total_price,
                staff_name: receipt.staff_id?.full_name || 'N/A',
                quantity_before: item.quantity_before || 0,
                quantity_after: item.quantity_after || item.quantity,
                reason: `Nhập hàng theo phiếu ${receipt.receipt_code}`,
                content: receipt.content
            };
        }).filter(item => item !== null);

        res.json({
            success: true,
            data: {
                inventory: {
                    _id: inventory._id,
                    name: inventory.name,
                    unit: inventory.unit,
                    currentstock: inventory.currentstock,
                    total_imported: inventory.total_imported || 0
                },
                history: historyData,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalRecords: total,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Get inventory history error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử nhập hàng',
            error: error.message
        });
    }
};

const updateInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, unit, costperunit, supplier, minstocklevel, storageType } = req.body;

        console.log(`updateInventory: id=${id}, data=${JSON.stringify(req.body)}`);

        if (!mongoose.isValidObjectId(id)) {
            console.error(`Invalid inventory ID: ${id}`);
            return res.status(400).json({
                success: false,
                message: 'ID nguyên liệu không hợp lệ'
            });
        }

        if (storageType && !['perishable', 'semi-perishable', 'dry'].includes(storageType)) {
            console.error(`Invalid storageType: ${storageType}`);
            return res.status(400).json({
                success: false,
                message: 'Loại bảo quản không hợp lệ'
            });
        }

        const existingInventory = await Inventory.findById(id);
        if (!existingInventory || !existingInventory.isactive) {
            console.warn(`Inventory not found or inactive: id=${id}`);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }

        if (name && name !== existingInventory.name) {
            const duplicateName = await Inventory.findOne({
                name: name,
                isactive: true,
                _id: { $ne: id }
            });
            if (duplicateName) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên nguyên liệu đã tồn tại'
                });
            }
        }

        const updateData = {
            ...(name && { name: name.trim() }),
            ...(unit && { unit }),
            ...(costperunit !== undefined && { costperunit: Number(costperunit) }),
            ...(supplier && { supplier: supplier.trim() }),
            ...(minstocklevel !== undefined && { minstocklevel: Number(minstocklevel) }),
            ...(storageType && { storageType }),
            updatedat: new Date()
        };

        const inventory = await Inventory.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            data: inventory,
            message: 'Cập nhật nguyên liệu thành công'
        });
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const stockCheck = async (req, res) => {
    try {
        const { id } = req.params;
        const { actual_stock } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nguyên liệu không hợp lệ'
            });
        }

        if (actual_stock === undefined || actual_stock < 0) {
            return res.status(400).json({
                success: false,
                message: 'Số liệu thực tế không hợp lệ'
            });
        }

        const inventory = await Inventory.findById(id);
        if (!inventory || !inventory.isactive) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }

        const oldStock = inventory.currentstock;
        const difference = Number(actual_stock) - oldStock;

        inventory.currentstock = Number(actual_stock);
        inventory.updatedat = new Date();

        await inventory.save();

        res.json({
            success: true,
            data: inventory,
            message: `Cập nhật kiểm kho thành công. Chênh lệch: ${difference > 0 ? '+' : ''}${difference} ${inventory.unit}`,
            difference: difference
        });
    } catch (error) {
        console.error('Stock check error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const importStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, costperunit } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nguyên liệu không hợp lệ'
            });
        }

        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng nhập phải lớn hơn 0'
            });
        }

        const inventory = await Inventory.findById(id);
        if (!inventory || !inventory.isactive) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }

        inventory.currentstock += Number(quantity);
        if (costperunit && costperunit > 0) {
            inventory.costperunit = Number(costperunit);
        }
        inventory.last_import_quantity = Number(quantity);
        inventory.last_import_price = Number(costperunit) || inventory.costperunit;
        inventory.last_import_date = new Date();
        inventory.updatedat = new Date();

        await inventory.save();

        res.json({
            success: true,
            data: inventory,
            message: `Nhập kho thành công ${quantity} ${inventory.unit}`
        });
    } catch (error) {
        console.error('Import stock error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getLowStockItems = async (req, res) => {
    try {
        const lowStockItems = await Inventory.find({
            isactive: true,
            $expr: { $lte: ['$currentstock', '$minstocklevel'] }
        }).sort({ currentstock: 1 });

        res.json({
            success: true,
            data: lowStockItems
        });
    } catch (error) {
        console.error('Get low stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách sắp hết hàng'
        });
    }
};

const deleteInventory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nguyên liệu không hợp lệ'
            });
        }

        const inventory = await Inventory.findByIdAndUpdate(
            id,
            { isactive: false, updatedat: new Date() },
            { new: true }
        );

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nguyên liệu'
            });
        }

        res.json({
            success: true,
            message: 'Xóa nguyên liệu thành công'
        });
    } catch (error) {
        console.error('Delete inventory error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getDailyIngredientConsumption = async (req, res) => {
    try {
        let { days = 7, startDate, endDate } = req.query;
        days = parseInt(days) || 7;

        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

        console.log(`getDailyIngredientConsumption: start=${start}, end=${end}, days=${days}`);

        const orderItems = await Order.aggregate([
            {
                $match: {
                    created_at: { $gte: start, $lte: end },
                    status: { $in: ['completed', 'served'] }
                }
            },
            { $unwind: '$order_items' },
            {
                $group: {
                    _id: {
                        menu_item_id: '$order_items.menu_item_id',
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }
                    },
                    quantity: { $sum: '$order_items.quantity' }
                }
            }
        ]).catch(err => {
            console.error('Error in orderItems aggregation:', err);
            return [];
        });

        const menuItemQuantities = {};
        orderItems.forEach(item => {
            const key = `${item._id.menu_item_id}_${item._id.date}`;
            menuItemQuantities[key] = (menuItemQuantities[key] || 0) + item.quantity;
        });

        const ingredientConsumption = {};
        for (const [key, quantity] of Object.entries(menuItemQuantities)) {
            const [menuItemId, date] = key.split('_');
            const recipe = await MenuItemRecipe.findOne({ menu_item_id: menuItemId }).catch(err => {
                console.error(`Error fetching recipe for menu_item_id=${menuItemId}:`, err);
                return null;
            });
            if (recipe && recipe.ingredients.length > 0) {
                for (const ingredient of recipe.ingredients) {
                    const inventoryId = ingredient.inventory_id.toString();
                    const quantityNeeded = ingredient.quantity_needed * quantity;

                    if (!ingredientConsumption[inventoryId]) {
                        ingredientConsumption[inventoryId] = {
                            inventory_id: inventoryId,
                            total_quantity: 0,
                            unit: ingredient.unit,
                            daily_quantities: {}
                        };
                    }
                    ingredientConsumption[inventoryId].total_quantity += quantityNeeded;
                    ingredientConsumption[inventoryId].daily_quantities[date] =
                        (ingredientConsumption[inventoryId].daily_quantities[date] || 0) + quantityNeeded;
                }
            }
        }

        const orderDays = await Order.distinct('created_at', {
            created_at: { $gte: start, $lte: end },
            status: { $in: ['completed', 'served'] }
        }).then(dates => new Set(dates.map(d => d.toISOString().split('T')[0])).size).catch(err => {
            console.error('Error counting order days:', err);
            return 1;
        });

        const effectiveDays = Math.max(1, orderDays);

        const dailyConsumption = await Promise.all(
            Object.values(ingredientConsumption).map(async (item) => {
                const inventory = await Inventory.findById(item.inventory_id).select('name currentstock minstocklevel storageType').catch(err => {
                    console.error(`Error fetching inventory for ID=${item.inventory_id}:`, err);
                    return null;
                });
                if (!inventory) {
                    console.warn(`Inventory not found for ID: ${item.inventory_id}`);
                    return null;
                }

                let periodDays = 7, safeRate = 1.2, desc = "", formula = "", usedForDays = 7;
                let weekdayTotal = 0, weekdayCount = 0, weekendMax = 0;

                for (const [date, quantity] of Object.entries(item.daily_quantities)) {
                    const day = new Date(date).getDay();
                    if (day >= 1 && day <= 5) {
                        weekdayTotal += quantity;
                        weekdayCount++;
                    } else {
                        weekendMax = Math.max(weekendMax, quantity);
                    }
                }
                const weekdayAverage = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;

                if (inventory.storageType === 'perishable') {
                    usedForDays = 3;
                    safeRate = 1.2;
                    baseImport = (weekdayAverage * 3) * safeRate;
                    desc = `Nguyên liệu tươi (dễ hỏng) nhập cho 3 ngày, cộng 20% dự phòng.`;
                    formula = `(${weekdayAverage.toFixed(2)} x 3 ngày) x 1.2`;
                } else if (inventory.storageType === 'semi-perishable') {
                    usedForDays = 5;
                    safeRate = 1.3;
                    baseImport = (weekdayAverage * 3 + weekendMax * 2) * safeRate;
                    desc = `Nguyên liệu bán tươi nhập cho 5 ngày, cộng 30% dự phòng.`;
                    formula = `(${weekdayAverage.toFixed(2)} x 3 + ${weekendMax.toFixed(2)} x 2) x 1.3`;
                } else if (inventory.storageType === 'dry') {
                    usedForDays = 7;
                    safeRate = 1.2;
                    baseImport = (weekdayAverage * 5 + weekendMax * 2) * safeRate;
                    desc = `Nguyên liệu khô nhập cho 1 tuần, có dự phòng 20%.`;
                    formula = `(${weekdayAverage.toFixed(2)} x 5 + ${weekendMax.toFixed(2)} x 2) x 1.2`;
                }

                const suggestedImport = Math.max(
                    0,
                    Math.ceil(baseImport - (inventory?.currentstock || 0))
                );

                return {
                    inventory_id: item.inventory_id,
                    name: inventory.name || 'N/A',
                    unit: item.unit,
                    total_quantity: item.total_quantity,
                    daily_average: weekdayAverage,
                    current_stock: inventory.currentstock || 0,
                    min_stock_level: inventory.minstocklevel || 0,
                    suggested_import: suggestedImport,
                    max_safe_import: Math.ceil(suggestedImport * (inventory.storageType === 'perishable' ? 1.1 : inventory.storageType === 'semi-perishable' ? 1.2 : 1.3)),
                    used_for_days: usedForDays,
                    formula: `${formula} - tồn kho (${inventory.currentstock || 0})`,
                    description: `${desc} Đã trừ tồn kho hiện tại.`,
                };
            })
        );

        const filteredConsumption = dailyConsumption.filter(item => item !== null);

        res.json({
            success: true,
            data: filteredConsumption,
            period: { startDate: start.toISOString(), endDate: end.toISOString(), days: effectiveDays }
        });
    } catch (error) {
        console.error('getDailyIngredientConsumption error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tính toán tiêu thụ nguyên liệu',
            error: error.message
        });
    }
};

module.exports = {
    getAllInventory,
    getInventoryById,
    createInventory,
    updateInventory,
    stockCheck,
    importStock,
    getLowStockItems,
    deleteInventory,
    getInventoryHistory,
    getDailyIngredientConsumption
};