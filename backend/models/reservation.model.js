const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ReservationSchema = new Schema({
  customer_id: { type: Schema.Types.ObjectId, ref: "User" },
  // Support both single table (backward compatibility) and multiple tables
  table_id: { type: Schema.Types.ObjectId, ref: "Table" }, // For backward compatibility
  table_ids: [{ type: Schema.Types.ObjectId, ref: "Table" }], // New field for multiple tables
  date: { type: Date, required: true },
  // time: { type: String, required: true },
  slot_id: { type: Schema.Types.ObjectId, ref: "BookingSlot", required: true }, // mới
  slot_start_time: { type: String, required: true }, // "07:00", chốt theo slot lúc đặt
  slot_end_time: { type: String, required: true }, // "09:00", chốt theo slot lúc đặt
  guest_count: { type: Number },
  contact_name: { type: String, required: true },
  contact_phone: { type: String, required: true },
  contact_email: { type: String, default: "" },
  created_by_staff: {
    //phân biệt khách đặt hay nhân viên đặt hộ
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false, // Null = khách tự đặt, có giá trị = nhân viên đặt
  },
  assigned_staff: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false // Nhân viên được assign để phục vụ bàn này
  },
  status: {
    type: String,
    enum: [
      "pending",
      "confirmed",
      "cancelled",
      "no_show",
      "completed",
      "seated"
    ],
    default: "pending",
  },
  pre_order_items: [
    {
      menu_item_id: { type: Schema.Types.ObjectId, ref: "MenuItem" },
      quantity: { type: Number },
    },
  ],
  deposit_amount: { type: Number },
  total_amount: { type: Number }, // Total amount of pre-order items
  payment_order_id: { type: String }, // Payment gateway order ID
  payment_method: {
    type: String,
    enum: ["vnpay", "momo", "cash", "credit_card", "bank_transfer"],
  },
  payment_date: { type: Date },
  reminder_sent: { type: Boolean, default: false },
  payment_status: {
    type: String,
    enum: ["pending", "partial", "paid", "refunded"],
    default: "pending",
  },
  notes: { type: String },
  promotion: { type: String }, // Mã giảm giá hoặc thông tin promotion đã áp dụng
  auto_cancelled_at: { type: Date }, // Thời gian tự động hủy (nếu có)
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Virtual getter for backward compatibility
ReservationSchema.virtual("primaryTable").get(function () {
  return this.table_ids && this.table_ids.length > 0
    ? this.table_ids[0]
    : this.table_id;
});

// Ensure virtuals are serialized
ReservationSchema.set("toJSON", { virtuals: true });
ReservationSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Reservation", ReservationSchema);
