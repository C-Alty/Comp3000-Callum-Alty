require("dotenv").config({ path: __dirname + "/.env" });
console.log("API Key Loaded:", process.env.AISSTREAM_API_KEY ? "Yes" : "No");

if (!process.env.AISSTREAM_API_KEY) {
  console.error("Missing AISSTREAM_API_KEY in .env");
  process.exit(1);
}

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { Server } = require("socket.io");
const path = require("path");
const aisHandler = require("./ais_handler");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../frontend")));
aisHandler(io); 
console.log("AIS Handler Initialized.");

app.get("/", (req, res) => {
  console.log("Request received for /");
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// hidden crashes
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});
