const express = require('express');
const router = express.Router();
const userRouter = require("./user.routes");
const menuItemRouter = require("./menuItem.routes");
const categoryRouter = require("./category.routes");
const tableRouter = require("./table.routes");
const areaRouter = require("./area.routes");
const reservationRouter = require("./reservation.routes");
const paymentRouter = require("./payment.routes");

router.use("/user", userRouter);
router.use("/menu-items", menuItemRouter);
router.use("/categories", categoryRouter);
router.use("/tables", tableRouter);
router.use("/areas", areaRouter);
router.use("/reservations", reservationRouter);
router.use("/payment", paymentRouter);

module.exports = router;