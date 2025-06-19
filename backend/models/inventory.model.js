// models/inventory.model.js - PHIÊN BẢN ĐÃ SỬA
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventorySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  unit: { type: String, required: true },
  costperunit: { type: Number, min: 0, default: 0 }, // ✅ BỎ required, mặc định 0
  supplier: { type: String, required: true },
  minstocklevel: { type: Number, required: true, min: 0, default: 10 }, 
  currentstock: { type: Number, required: true, min: 0, default: 0 }, // ✅ Luôn mặc định 0
  
  // ✅ TRACKING FIELDS
  last_import_date: { type: Date },
  last_import_quantity: { type: Number },
  last_import_price: { type: Number },
  total_imported: { type: Number, default: 0 },
  
  isactive: { type: Boolean, default: true },
  createdat: { type: Date, default: Date.now },
  updatedat: { type: Date, default: Date.now }
});

// ✅ MIDDLEWARE để track changes
InventorySchema.pre('findOneAndUpdate', function() {
  this.set({ updatedat: new Date() });
});

module.exports = mongoose.model('Inventory', InventorySchema);
