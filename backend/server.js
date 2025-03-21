require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { Server } = require("socket.io");
const path = require("path");
const aisHandler = require('./ais_handler'); 


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, "../frontend")));
console.log("static files loaded");

aisHandler(io);
console.log("AIS handler initialized.");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

server.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
});

io.on("connection", (socket) => {
  console.log("websocket connected");

  socket.on("disconnect", () => {
    console.warn("websocket disconnected");
  });

  socket.on("error", (error) => {
    console.error("websocket error:", error);
  });
});

process.on("uncaughtException", (err) => {
  console.error("uncaught exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("unhandled rejection:", reason);
});
