require("dotenv").config();
const WebSocket = require("ws");
const { spawn } = require("child_process");

module.exports = function aisHandler(io) {
  const API_KEY = process.env.AISSTREAM_API_KEY;
  if (!API_KEY) {
    console.error("error: Missing AISSTREAM_API_KEY in .env");
    return;
  }

  const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

  socket.addEventListener("open", () => {
    console.log("connected to AIS stream");

    const subscriptionMessage = {
      APIkey: API_KEY,
      BoundingBoxes: [
        [
          [-180, -90], // cfurrently set to entire world
          [180, 90],
        ],
      ],
    };

    socket.send(JSON.stringify(subscriptionMessage));
  });

  socket.addEventListener("error", (event) => {
    console.error("websocket error:", event);
  });

  socket.addEventListener("close", () => {
    console.warn("websocket connection closed");
  });

  socket.addEventListener("message", (event) => {
    try {
      let aisMessage = JSON.parse(event.data);

      if (aisMessage["MessageType"] === "PositionReport") {
        let positionReport = aisMessage["Message"]["PositionReport"];
        let shipData = {
          shipId: positionReport["UserID"],
          latitude: positionReport["Latitude"],
          longitude: positionReport["Longitude"],
        };

        //console.log(`ship ${shipData.shipId} at [${shipData.latitude}, ${shipData.longitude}]`);  //(debugging)

        // detection model
        detectAnomaly(shipData, (isAnomaly) => {
          if (isAnomaly) {
            console.warn(`anomaly detected for ship ${shipData.shipId}`);
            io.emit("anomaly-alert", shipData);
          }
        });

        io.emit("ais-data", shipData);
      }
    } catch (error) {
      console.error("error parsing AIS data:", error);
    }
  });
};

function detectAnomaly(shipData, callback) {
  const pythonProcess = spawn("python", ["ml_model/detect_anomaly.py"], {
    stdio: ["pipe", "pipe", "ignore"],
  });

  pythonProcess.stdin.write(JSON.stringify(shipData) + "\n");
  pythonProcess.stdin.end();

  pythonProcess.stdout.on("data", (data) => {
    try {
      const result = JSON.parse(data.toString());
      callback(result.isAnomaly);
    } catch (error) {
      console.error("error parsing anomaly detection result:", error);
    }
  });

  pythonProcess.on("error", (error) => {
    console.error("error running Python script:", error);
  });
}
