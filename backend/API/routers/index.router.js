const userRouter = require("./user.router");
const tableRouter = require("./table.router");
const areaRouter = require("./area.router");
const reservationRouter = require("./reservation.router");

module.exports = (app) => {
    app.use("/user", userRouter);
    app.use("/tables", tableRouter);
    app.use("/areas", areaRouter);
    app.use("/reservations", reservationRouter);

};