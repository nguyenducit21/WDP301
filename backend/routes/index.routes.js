const userRouter = require("./user.routes");
const menuItemRouter = require("./menuitem.routes");
const categoryRouter = require("./category.routes");
const dashboardRoutes = require('./dashboard.route');
module.exports = (app) => {

    app.use("/user", userRouter);
    app.use('/api/menuitems', menuItemRouter);
    app.use('/api/categories', categoryRouter);
    app.use('/api/dashboard', dashboardRoutes);
};