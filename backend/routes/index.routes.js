const express = require('express');
const router = express.Router();
const userRouter = require("./user.routes");
const menuItemRouter = require("./menuitem.routes");
const categoryRouter = require("./category.routes");
const tableRouter = require("./table.routes");
const areaRouter = require("./area.routes");
const reservationRouter = require("./reservation.routes");
const paymentRouter = require("./payment.routes");
const dashboardRoutes = require("./dashboard.route");
const inventoryRoutes = require('./inventory.routes');
const recipeRoutes = require('./menuItemRecipe.routes');

router.use("/user", userRouter);
router.use("/menu-items", menuItemRouter);
router.use("/categories", categoryRouter);
router.use("/tables", tableRouter);
router.use("/areas", areaRouter);
router.use("/reservations", reservationRouter);
router.use("/payment", paymentRouter);
router.use('/dashboard', dashboardRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/recipes', recipeRoutes);



module.exports = router;