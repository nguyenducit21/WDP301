const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoleSchema = new Schema({
    name: { type: String, required: true, unique: true }, // admin, manager, staff, customer, warehouse staff
    description: { type: String }
});

module.exports = mongoose.model('Role', RoleSchema);
