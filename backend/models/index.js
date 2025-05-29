// models/index.js

const User = require("./user.model");
const Role = require("./role.model");
const Table = require("./table.model");
const MenuItem = require("./menuItem.model")


module.exports = {
  User,
  Role,
  Table,
  MenuItem
};
