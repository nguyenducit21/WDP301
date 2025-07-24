const Inventory = require('../models/inventory.model');
const Order = require('../models/order.model');
const Reservation = require('../models/reservation.model');
const MenuItemRecipe = require('../models/menuItemRecipe.model');
const ImportReceipt = require('../models/importReceipt.model');

const STORAGE_TYPE_CONFIG = {
  "perishable": { label: "Tươi sống", days: 2, buffer: 0.15 },
  "semi-perishable": { label: "Bán tươi", days: 4, buffer: 0.10 },
  "dry": { label: "Khô/đông lạnh", days: 7, buffer: 0.10 }
};

const getInventoryAnalytics = async (req, res) => {
  try {
    let { days = 14 } = req.query;
    days = parseInt(days) || 14;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);


    // Lấy toàn bộ inventory
    const inventories = await Inventory.find({ isactive: true }).lean();

    // Phân tích từng nguyên liệu
    const data = await Promise.all(
      inventories.map(async (inv) => {
        // 1. Tính toán tiêu thụ thực tế
        const { total, average, history } = await calculateConsumption(inv._id, start, end, days);

        // 2. Lấy config lưu trữ
        const conf = STORAGE_TYPE_CONFIG[inv.storageType] || STORAGE_TYPE_CONFIG['dry'];
        const usedForDays = conf.days;
        const buffer = conf.buffer;

        // 3. Tính lượng nhập đề xuất
        const suggest = Math.max(0, Math.ceil(average * usedForDays * (1 + buffer) - (inv.currentstock || 0)));

        // 4. Cảnh báo
        let warning = "";
        if (suggest > average * usedForDays * 2) {
          warning = "⚠️ Lượng nhập vượt quá bình thường, hãy kiểm tra lại!";
        }
        if ((inv.currentstock || 0) < (inv.minstocklevel || 0)) {
          warning += " 🛑 Tồn kho dưới mức tối thiểu!";
        }

        // 5. Công thức
        const formula = `(${average.toFixed(2)} × ${usedForDays}) × ${(1 + buffer)} - ${inv.currentstock}`;
        const description = `Đủ dùng cho ${usedForDays} ngày (${conf.label}), dự phòng ${Math.round(buffer * 100)}%.`;

        // 6. Ngày nhập gần nhất
        const lastImport = await ImportReceipt.findOne({ "items.inventory_id": inv._id })
          .sort({ created_at: -1 })
          .select('created_at');
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
        };
      })
    );

    res.json({ success: true, data, period: { from: start, to: end, days } });
  } catch (error) {
    console.error('getInventoryAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu dashboard', error: error.message });
  }
};

// Hàm tính toán tiêu thụ nguyên liệu từ Reservation và Order
async function calculateConsumption(inventoryId, start, end, days) {
  try {

    // Chuẩn hóa start và end để so sánh ngày
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    // 1. Lấy toàn bộ Reservation đã hoàn thành
    const reservations = await Reservation.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'completed'
    })
      .populate('pre_order_items.menu_item_id', 'name')
      .lean();

    // 2. Lấy toàn bộ Order đã hoàn thành hoặc đã phục vụ
    const orders = await Order.find({
      created_at: { $gte: startDate, $lte: endDate },
      status: { $in: ['completed', 'served'] }
    })
      .populate('order_items.menu_item_id', 'name')
      .lean();


    // 3. Tạo map để lưu số lượng menu item theo ngày
    const menuItemDateQuantity = {};

    // Xử lý từ Reservation (pre_order_items)
    for (const reservation of reservations) {
      const dateStr = new Date(reservation.date).toISOString().split('T')[0];
      for (const item of reservation.pre_order_items || []) {
        if (!item.menu_item_id || !item.quantity) {
          continue;
        }
        const key = `${item.menu_item_id._id}_${dateStr}`;
        menuItemDateQuantity[key] = (menuItemDateQuantity[key] || 0) + item.quantity;
      }
    }

    // Xử lý từ Order (order_items)
    for (const order of orders) {
      const dateStr = new Date(order.created_at).toISOString().split('T')[0];
      for (const item of order.order_items || []) {
        if (!item.menu_item_id || !item.quantity) {
          continue;
        }
        const key = `${item.menu_item_id._id}_${dateStr}`;
        menuItemDateQuantity[key] = (menuItemDateQuantity[key] || 0) + item.quantity;
      }
    }

    // 4. Lấy công thức của các món ăn sử dụng nguyên liệu này
    const recipes = await MenuItemRecipe.find({ "ingredients.inventory_id": inventoryId })
      .populate('menu_item_id', 'name')
      .lean();


    // 5. Tính tiêu thụ nguyên liệu theo ngày
    const dateMap = {};
    for (const recipe of recipes) {
      const ingredient = recipe.ingredients.find(ing => ing.inventory_id.toString() === inventoryId.toString());
      if (!ingredient) {
        continue;
      }

      for (let d = 0; d <= days; d++) {
        const dateObj = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
        if (dateObj > endDate) break;
        const dateStr = dateObj.toISOString().split('T')[0];
        const key = `${recipe.menu_item_id?._id}_${dateStr}`;
        const menuQty = menuItemDateQuantity[key] || 0;
        const quantityUsed = menuQty * (ingredient.quantity_needed || 0);

        if (!dateMap[dateStr]) dateMap[dateStr] = 0;
        dateMap[dateStr] += quantityUsed;
        if (quantityUsed > 0) {
        }
      }
    }


    // 6. Tính tổng và trung bình tiêu thụ
    const history = [];
    let total = 0;
    let count = 0;
    for (let d = 0; d <= days; d++) {
      const dateObj = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
      if (dateObj > endDate) break;
      const dateStr = dateObj.toISOString().split('T')[0];
      const qty = dateMap[dateStr] || 0;
      history.push(qty);
      total += qty;
      if (qty > 0) count++;
    }
    const average = count > 0 ? total / count : 0;


    return {
      total,
      average,
      history
    };
  } catch (error) {
    return { total: 0, average: 0, history: [] };
  }
}

module.exports = { getInventoryAnalytics };