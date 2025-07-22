// create server
const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const { autoCancelExpiredReservations } = require('./controllers/reservation.controller');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const { initializeSocket } = require('./socket/socket');
const io = initializeSocket(server);

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
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow both frontend URLs
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));


const cookieParser = require("cookie-parser");
app.use(cookieParser());

const router = require("./routes/index.routes");
app.use("/", router);

// Make io available globally
global.io = io;

// Thiết lập cron job tự động hủy đặt bàn hết hạn mỗi 10 phút
cron.schedule('*/1 * * * *', async () => {
  try {
    console.log('⏰ [CRON] Auto-cancel expired reservations running...');
    await autoCancelExpiredReservations({});
    console.log('✅ [CRON] Auto-cancel completed.');
  } catch (err) {
    console.error('❌ [CRON] Auto-cancel error:', err);
  }
});

// run server
server.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
});