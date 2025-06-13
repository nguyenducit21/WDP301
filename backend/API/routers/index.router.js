const userRouter = require("./user.router");
const menuItemRouter = require("./menuitem.routes");
const categoryRouter = require("./category.router");
module.exports = (app) => {

    app.use("/user", userRouter);
    app.use('/api/menuitems', menuItemRouter);
    app.use('/api/categories', categoryRouter);
};