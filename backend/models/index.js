// models/index.js

const User = require("./user.model");
const Role = require("./role.model");
const Table = require("./table.model");
const MenuItem = require("./menuItems.model");
const Category = require("./category.model");
const Area = require("./area.model");
const Reservation = require("./reservation.model");
const Order = require("./order.model");
const Bill = require("./bill.model");
const Combo = require("./combo.model");
const Inventory = require("./inventory.model");


module.exports = {
  User,
  Role,
  Table,
  MenuItem,
  Category,
  Area,
  Reservation,
  Order,
  Bill,
  Combo,
  Inventory
};
