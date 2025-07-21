// create server
const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
// Cấu hình múi giờ UTC+7
process.env.TZ = 'Asia/Ho_Chi_Minh'; // Hoặc 'UTC+07:00'
console.log('Current timezone:', new Date().toString());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // Frontend URL
    methods: ["GET", "POST"]
  }
});

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

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join waiter room
  socket.on('join-waiter-room', () => {
    socket.join('waiters');
    console.log('Waiter joined room:', socket.id);
  });

  // Join chef room
  socket.on('join-chef-room', () => {
    socket.join('chefs');
    console.log('Chef joined room:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available globally
global.io = io;

// run server
server.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
});