// // models/inventory.model.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên nguyên liệu không được bỏ trống'],
    trim: true
  },
  unit: {
    type: String,
    required: [true, 'Đơn vị không được bỏ trống'],
    trim: true
  },
  costperunit: {
    type: Number,
    required: true,
    min: [0, 'Giá mỗi đơn vị phải >= 0']
  },
  supplier: {
    type: String,
    required: [true, 'Nhà cung cấp không được bỏ trống'],
    trim: true
  },
  minstocklevel: {
    type: Number,
    required: true,
    min: [0, 'Mức tồn tối thiểu phải >= 0']
  },
  currentstock: {
    type: Number,
    required: true,
    min: [0, 'Tồn kho hiện tại phải >= 0']
  },
  total_imported: {
    type: Number,
    default: 0,
    min: [0, 'Tổng nhập kho phải >= 0']
  },
  isactive: {
    type: Boolean,
    default: true
  },
  storageType: { // Thêm trường mới
    type: String,
    enum: ['dry', 'semi-perishable', 'perishable'],
    default: 'dry' // Khô (dry), Bán tươi (semi-perishable), Tươi (perishable)
  },
  last_import_date: Date,
  last_import_price: Number,
  last_import_quantity: Number,
  createdat: {
    type: Date,
    default: Date.now
  },
  updatedat: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false });

module.exports = mongoose.model('Inventory', inventorySchema);