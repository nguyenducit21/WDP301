// create server
const express = require("express");

const app = express();

require("dotenv").config(); // .env

// database
const database = require("./config/database");
const port = process.env.PORT;
database.connectToDatabase();


// body parser
const bodyParser = require("body-parser");
app.use(bodyParser.json());


// cors
const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


const cookieParser = require("cookie-parser");
app.use(cookieParser());

const router = require("./API/routers/index.router");
router(app);

// run server
app.listen(port, () => {
  console.log(`server is running at port ${port}`);
});