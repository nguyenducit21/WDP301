const userRouter = require("./user.router");

module.exports = (app) => {

    app.use("/user", userRouter);

};