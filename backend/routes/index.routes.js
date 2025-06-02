const userRouter = require("./user.routes");
const menuItemRouter = require("./menuItem.routes");
const categoryRouter = require("./category.routes");
module.exports = (app) => {

    app.use("/user", userRouter);
    app.use("/menu-items", menuItemRouter);
    app.use("/categories", categoryRouter);
};