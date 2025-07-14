const express = require('express');
const router = express.Router();
const userRouter = require("./user.routes");
const menuItemRouter = require("./menuItem.routes");
const categoryRouter = require("./category.routes");
const tableRouter = require("./table.routes");
const areaRouter = require("./area.routes");
const reservationRouter = require("./reservation.routes");
const paymentRouter = require("./payment.routes");
const dashboardRoutes = require("./dashboard.route");
const inventoryRoutes = require('./inventory.routes');
const recipeRoutes = require('./menuItemRecipe.routes');
const importReceiptRoutes = require('./importReceipt.routes');
const employeeRoutes = require('./employee.routes');
const permissionRoutes = require('./permission.routes');


const orderRoutes = require("./order.routes");
const bookingSlotRouter = require("./bookingSlot.routes");

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
router.use('/import-receipt', importReceiptRoutes);
router.use('/employees', employeeRoutes);
router.use('/permissions', permissionRoutes);


router.use('/orders', orderRoutes);
router.use('/booking-slots', bookingSlotRouter);

module.exports = router;
