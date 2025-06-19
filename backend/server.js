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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cors
const cors = require("cors");
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));


const cookieParser = require("cookie-parser");
app.use(cookieParser());

const router = require("./routes/index.routes");
app.use("/", router);


// run server
app.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
});