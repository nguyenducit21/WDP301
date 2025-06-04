process.env.TZ = 'Asia/Ho_Chi_Minh'; // Đặt múi giờ mặc định là Việt Nam (UTC+07:00)

// Khởi tạo server
const express = require("express");
const app = express();  // Khởi tạo app tại đây

app.use('/uploads', express.static('uploads')); // Bây giờ có thể sử dụng app

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
