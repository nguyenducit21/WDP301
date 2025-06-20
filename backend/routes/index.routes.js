const userRouter = require("./user.routes");
const tableRouter = require("./table.routes");
const areaRouter = require("./area.routes");
const reservationRouter = require("./reservation.routes");

module.exports = (app) => {
    app.use("/user", userRouter);
    app.use("/tables", tableRouter);
    app.use("/areas", areaRouter);
    app.use("/reservations", reservationRouter);

};