const mongoose = require('mongoose');

// Kết nối DB
mongoose.connect('mongodb://localhost:27017/RMS', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const STAFF_ID = new mongoose.Types.ObjectId("68395986e751992ef4491bbf");
const MENU_IDS = [
  new mongoose.Types.ObjectId("68426253b3170c9158d80a36"), // Cơm cháy
  new mongoose.Types.ObjectId("68425f15b3170c9158d80a1d"), // Phở tái
  new mongoose.Types.ObjectId("683ed9ce5a729ccda6dea437"), // Mirinda Xá Xị
  new mongoose.Types.ObjectId("683ed9ce5a729ccda6dea42f"), // Salad cá ngừ
  new mongoose.Types.ObjectId("683ed9ce5a729ccda6dea429"), // Cơm tấm sườn
];

const TABLE_IDS = [
  new mongoose.Types.ObjectId("6854729dd666f90baedb35a0"),
  new mongoose.Types.ObjectId("6854729dd666f90baedb35a1"),
  new mongoose.Types.ObjectId("6854729dd666f90baedb35a2"),
  new mongoose.Types.ObjectId("6854729dd666f90baedb35ae"),
  new mongoose.Types.ObjectId("6854729dd666f90baedb35c5"),
];

const SLOT_IDS = [
  new mongoose.Types.ObjectId("68549713bfece1302d5b5c88"),
  new mongoose.Types.ObjectId("68549713bfece1302d5b5c89"),
  new mongoose.Types.ObjectId("68549713bfece1302d5b5c8e"),
  new mongoose.Types.ObjectId("68549713bfece1302d5b5c8f"),
];

const CUSTOMER_NAMES = ["Nguyễn Văn A", "Nguyễn Tiến Đạt", "Trần Thị B", "Hoàng Văn C", "Lê Thị D"];
const CUSTOMER_PHONES = ["0321123123", "0968338829", "0912345678", "0987654321", "0909123456"];
const CUSTOMER_EMAILS = ["a@gmail.com", "dat10bn@gmail.com", "b@gmail.com", "c@gmail.com", "d@gmail.com"];

// Lấy schema model (đảm bảo đúng path)
const Order = require('../models/order.model');
const Reservation = require('../models/reservation.model');

// Random trong khoảng a-b
function randomInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// Random 1 phần tử từ array
function randomArr(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

// Sinh đơn hàng
async function generate() {
  // Xoá order seed cũ nếu cần
  // await Order.deleteMany({ note: "seed test" });
  // await Reservation.deleteMany({ note: "seed test" });

  const orders = [];
  const reservations = [];

  // 10 ngày gần nhất
  for (let d = 9; d >= 0; d--) {
    const date = new Date();
    date.setHours(8, 0, 0, 0);
    date.setDate(date.getDate() - d);
    const weekday = date.getDay();

    // Ngày thường ít, cuối tuần nhiều order
    const count = (weekday === 0 || weekday === 6) ? randomInt(4, 6) : randomInt(1, 2);

    for (let j = 0; j < count; j++) {
      // Random customer info
      const idx = randomInt(0, CUSTOMER_NAMES.length - 1);

      // Random bàn, slot, món
      const table_id = randomArr(TABLE_IDS);
      const slot_id = randomArr(SLOT_IDS);

      // Sinh reservation trước, gán vào order
      const reservation = new Reservation({
        table_id,
        table_ids: [table_id],
        date: new Date(date),
        slot_id,
        slot_start_time: "07:00",
        slot_end_time: "08:00",
        guest_count: randomInt(2, 6),
        contact_name: CUSTOMER_NAMES[idx],
        contact_phone: CUSTOMER_PHONES[idx],
        contact_email: CUSTOMER_EMAILS[idx],
        created_by_staff: STAFF_ID,
        status: "completed",
        pre_order_items: [],
        payment_status: "paid",
        notes: "seed test",
        created_at: new Date(date),
        updated_at: new Date(date)
      });
      reservations.push(reservation);

      // Tạo order_items random
      const itemCount = randomInt(1, 4);
      const usedMenu = MENU_IDS.slice().sort(() => Math.random() - 0.5).slice(0, itemCount);
      const order_items = usedMenu.map(menu_id => ({
        menu_item_id: menu_id,
        quantity: randomInt(1, 4),
        price: randomInt(20000, 90000),
      }));

      orders.push({
        reservation_id: reservation._id,
        table_id,
        staff_id: STAFF_ID,
        order_items,
        combo_items: [],
        status: "completed",
        note: "seed test",
        created_at: new Date(date),
        updated_at: new Date(date)
      });
    }
  }

  // Insert tất cả reservations, sau đó insert orders
  await Reservation.insertMany(reservations);
  await Order.insertMany(orders);

  console.log(`Đã insert ${orders.length} order, ${reservations.length} reservation mẫu!`);
  mongoose.disconnect();
}

generate().catch(e => {
  console.error(e);
  mongoose.disconnect();
});
