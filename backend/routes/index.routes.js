const express = require('express');
const router = express.Router();
const userRouter = require("./user.routes");
const menuItemRouter = require("./menuItem.routes");
const categoryRouter = require("./category.routes");
const tableRouter = require("./table.routes");
const areaRouter = require("./area.routes");
const reservationRouter = require("./reservation.routes");

router.use("/api/user", userRouter);
router.use("/api/menu-items", menuItemRouter);
router.use("/api/categories", categoryRouter);
router.use("/api/tables", tableRouter);
router.use("/api/areas", areaRouter);
router.use("/api/reservations", reservationRouter);

module.exports = router;