require("dotenv").config();
const WebSocket = require("ws");
const { spawn } = require("child_process");

module.exports = function aisHandler(io) {
  const API_KEY = process.env.AISSTREAM_API_KEY;
  if (!API_KEY) {
    console.error("ERROR: Missing AISSTREAM_API_KEY in .env");
    return;
  }

  const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

  let shipQueue = [];
  let isProcessing = false;

  socket.addEventListener("open", () => {
    console.log("connected to AIS stream");

    const subscriptionMessage = {
      APIKey: API_KEY,
      BoundingBoxes: [[[-180, -90], [180, 90]]],
      Filters: { MessageTypes: [1, 2, 3, 5] }
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
          speed: positionReport["SOG"] || 0,
          course: positionReport["COG"] || 0,
          speed_diff: 0,
          course_diff: 0
        };

        shipQueue.push(shipData);
        if (shipQueue.length > 100) shipQueue.shift(); // prevent memory overload
      }
    } catch (error) {
      console.error("error parsing AIS data:", error);
    }
  });

  setInterval(() => {
    if (!isProcessing && shipQueue.length > 0) {
      isProcessing = true;
      let shipData = shipQueue.shift();

      detectAnomaly(shipData, (isAnomaly) => {
        shipData.isAnomaly = isAnomaly;  // add anomaly status

        if (isAnomaly) {
          console.warn(`anomaly detected for ship ${shipData.shipId}`);
          io.emit("anomaly-alert", shipData);
        }

        io.emit("ais-data", shipData);
        isProcessing = false;
      });
    }
  }, 500);
};

function detectAnomaly(shipData, callback) {
  try {
    const pythonProcess = spawn("python", ["ml_model/detect_anomaly.py"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    pythonProcess.stdin.write(JSON.stringify(shipData) + "\n");
    pythonProcess.stdin.end();

    let result = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error("python error:", data.toString());
    });

    pythonProcess.stdout.on("end", () => {
      try {
        let cleanedResult = result.trim().split("\n").pop();
        console.log(cleanedResult);
        const parsedResult = JSON.parse(cleanedResult);
        callback(parsedResult.isAnomaly);
      } catch (error) {
        console.error("error parsing anomaly detection result:", error);
      }
    });

    pythonProcess.on("error", (error) => {
      console.error("error running Python script:", error);
    });

    pythonProcess.on("exit", (code) => {
      if (code !== 0) {
        console.error(`python process exited with code ${code}`);
      }
    });
  } catch (err) {
    console.error("error starting Python process:", err);
  }
}
