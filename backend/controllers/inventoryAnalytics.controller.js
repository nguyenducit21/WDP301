// controllers/inventoryAnalytics.controller.js
const Inventory = require('../models/inventory.model');
const Order = require('../models/order.model');
const MenuItemRecipe = require('../models/menuItemRecipe.model');
const ImportReceipt = require('../models/importReceipt.model');

const STORAGE_TYPE_CONFIG = {
  perishable: { label: "Tươi sống", days: 2, buffer: 0.15 },
  semi_perishable: { label: "Bán tươi", days: 4, buffer: 0.10 },
  dry: { label: "Khô/đông lạnh", days: 7, buffer: 0.10 }
};


const getInventoryAnalytics = async (req, res) => {
  try {
    let { days = 14 } = req.query;
    days = parseInt(days) || 14;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    // Lấy toàn bộ inventory
    const inventories = await Inventory.find();

    // Phân tích từng nguyên liệu
    const data = await Promise.all(
      inventories.map(async (inv) => {
        // 1. Tính toán tiêu thụ thực tế
        const { total, average, history } = await calculateConsumption(inv._id, start, end);

        // 2. Lấy config lưu trữ
        const conf = STORAGE_TYPE_CONFIG[inv.storageType] || STORAGE_TYPE_CONFIG['dry'];
        const usedForDays = conf.days;
        const buffer = conf.buffer;

        // 3. Tính lượng nhập đề xuất
        const suggest = Math.max(0, Math.ceil(average * usedForDays * (1 + buffer) - (inv.currentstock || 0)));

        // 4. Cảnh báo
        let warning = "";
        if (suggest > average * usedForDays * 2) warning = "⚠️ Lượng nhập vượt quá bình thường, hãy kiểm tra lại!";
        if ((inv.currentstock || 0) < (inv.minstocklevel || 0)) warning += " 🛑 Tồn kho dưới mức tối thiểu!";

        // 5. Công thức
        const formula = `(${average.toFixed(2)} × ${usedForDays}) × ${(1 + buffer)} - ${inv.currentstock}`;
        const description = `Đủ dùng cho ${usedForDays} ngày (${conf.label}), dự phòng ${Math.round(buffer * 100)}%.`;

        // 6. Ngày nhập gần nhất
        const lastImport = await ImportReceipt.findOne({ "items.inventory_id": inv._id }).sort({ created_at: -1 }).select('created_at');
        const lastImportDate = lastImport && lastImport.created_at
          ? lastImport.created_at.toLocaleDateString()
          : "--";

        return {
          id: inv._id,
          name: inv.name,
          unit: inv.unit,
          storageType: conf.label,
          currentStock: inv.currentstock || 0,
          minStockLevel: inv.minstocklevel || 0,
          avgDailyUsed: average,
          totalUsed: total,
          neededForDays: Math.ceil(average * usedForDays),
          suggestImport: suggest,
          usedForDays,
          buffer,
          formula,
          description,
          warning,
          lastImportDate,
          history
        }
      })
    );

    res.json({ success: true, data, period: { from: start, to: end, days } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu dashboard', error: error.message });
  }
};

// --- HÀM TÍNH TOÁN TIÊU THỤ NGUYÊN LIỆU CHUẨN ---
// TÍNH TỪ ĐƠN ĐÃ HOÀN THÀNH (Order.status = 'completed'/'served')
// => TỔNG HỢP THEO NGÀY, TÍNH RA TRUNG BÌNH

async function calculateConsumption(inventoryId, start, end) {
  // 1. Lấy toàn bộ order_items đã bán trong khoảng thời gian
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
  ]);

  // 2. Map lại thành object: { menu_item_id, date, quantity }
  let menuItemDateQuantity = {};
  for (const item of orderItems) {
    const key = `${item._id.menu_item_id}_${item._id.date}`;
    menuItemDateQuantity[key] = item.quantity;
  }

  // 3. Lấy toàn bộ recipe sử dụng nguyên liệu này
  const recipes = await MenuItemRecipe.find({ "ingredients.inventory_id": inventoryId });

  // 4. Lặp từng ngày, tính tổng số lượng ingredient tiêu thụ/ngày
  let dateMap = {}; // { '2024-06-19': quantity_used, ... }
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      if (ing.inventory_id.toString() !== inventoryId.toString()) continue;
      // Tìm từng ngày menu_item_id này được bán
      for (let d = 0; d < 31; d++) {
        const dateObj = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
        if (dateObj > end) break;
        const dateStr = dateObj.toISOString().split('T')[0];
        const key = `${recipe.menu_item_id}_${dateStr}`;
        const menuQty = menuItemDateQuantity[key] || 0;
        if (!dateMap[dateStr]) dateMap[dateStr] = 0;
        dateMap[dateStr] += menuQty * ing.quantity_needed;
      }
    }
  }

  // 5. Tổng số lượng và trung bình/ngày
  const history = [];
  let total = 0;
  let count = 0;
  for (let d = 0; d < 31; d++) {
    const dateObj = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
    if (dateObj > end) break;
    const dateStr = dateObj.toISOString().split('T')[0];
    const qty = dateMap[dateStr] || 0;
    history.push(qty);
    total += qty;
    count += 1;
  }
  const average = count > 0 ? total / count : 0;

  return {
    total,
    average,
    history
  };
}

module.exports = { getInventoryAnalytics };
