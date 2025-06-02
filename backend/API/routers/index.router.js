const userRouter = require("./user.router");
const menuItemRouter = require("./menuitem.routes");
module.exports = (app) => {

    app.use("/user", userRouter);
    app.use('/api/menuitems', menuItemRouter);

};