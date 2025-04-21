require("dotenv").config();
const WebSocket = require("ws");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");

module.exports = function aisHandler(io) {
  const API_KEY = process.env.AISSTREAM_API_KEY;
  if (!API_KEY) {
    console.error("ERROR: Missing AISSTREAM_API_KEY in .env");
    return;
  }

  const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

  let shipQueue = [];
  let csvHeaderWritten = false;

  const livePath = path.join(__dirname, "../live_ais_data.csv");

  socket.addEventListener("open", () => {
    console.log("connected to AIS stream");

    const subscriptionMessage = {
      APIKey: API_KEY,
      BoundingBoxes: [[[-180, -90], [180, 90]]],
      Filters: { MessageTypes: [1, 2, 3] },
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
      const aisMessage = JSON.parse(event.data);

      // console.log("raw AIS message:", JSON.stringify(aisMessage, null, 2));

      if (aisMessage["MessageType"] === "PositionReport") {
        const positionReport = aisMessage["Message"]["PositionReport"];
        const shipData = {
          shipName: aisMessage?.MetaData?.ShipName || "Unknown",
          shipId: positionReport["UserID"],
          latitude: positionReport["Latitude"],
          longitude: positionReport["Longitude"],
          speed: positionReport["Sog"] || 0,
          course: positionReport["Cog"] || 0,
          timestamp: new Date().toISOString(),
          isAnomaly: false,
        };

        shipQueue.push(shipData);
        if (shipQueue.length > 100) shipQueue.shift();
      }
    } catch (error) {
      console.error("error parsing AIS data:", error);
    }
  });

  // handle simulated ships sent from frontend
  io.on("connection", (socket) => {
    socket.on("simulate-ship", (shipData) => {
      console.log("received simulated ship from frontend:", shipData);

      const formatted = `${shipData.shipId},${shipData.latitude},${shipData.longitude},${shipData.speed},${shipData.course},${new Date().toISOString()}\n`;

      if (!fs.existsSync(livePath)) {
        fs.writeFileSync(livePath, "mmsi,lat,lon,speed,course,timestamp\n");
        csvHeaderWritten = true;
      }

      fs.appendFileSync(livePath, formatted);
      console.log("simulated ship appended to live_ais_data.csv");

      const emittedShip = {
        shipId: shipData.shipId,
        latitude: shipData.latitude,
        longitude: shipData.longitude,
        speed: shipData.speed,
        course: shipData.course,
        timestamp: new Date().toISOString(),
        isAnomaly: false,
      };

      io.emit("ais-data", emittedShip);
      console.log("emitted simulated ship to map:", emittedShip);
    });
  });

  // Append live AIS data to CSV every 2 seconds
  setInterval(() => {
    if (shipQueue.length > 0) {
      if (!csvHeaderWritten && !fs.existsSync(livePath)) {
        fs.writeFileSync(livePath, "mmsi,lat,lon,speed,course,timestamp\n");
        csvHeaderWritten = true;
      }

      const rows = shipQueue.map((ship) => {
        return `${ship.shipId},${ship.latitude},${ship.longitude},${ship.speed},${ship.course},${ship.timestamp}`;
      });

      fs.appendFileSync(livePath, rows.join("\n") + "\n");
      // console.log(`appended ${shipQueue.length} ships to live_ais_data.csv`);
    }
  }, 2000);

  // emit live ship data to frontend every 2 seconds
  setInterval(() => {
    shipQueue.forEach((ship) => {
      io.emit("ais-data", ship);
    });
  }, 2000);

  // run ML model every 2 minutes
  setInterval(() => {
    console.log("running check_live_data.py...");

    const pythonProcess = spawn("python", ["ml_model/check_live_data.py"]);

    pythonProcess.stdout.on("data", (data) => {
      console.log("ML Output:", data.toString());
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error("python error:", data.toString());
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`python process exited with code ${code}`);
        return;
      }

      const checkedPath = path.join(__dirname, "../checked_live_ais_data.csv");
      const anomalies = [];

      fs.createReadStream(checkedPath)
        .pipe(csvParser())
        .on("data", (row) => {
          const isAnomaly = row.anomaly && row.anomaly === "-1";

          const shipData = {
            shipId: row.mmsi,
            latitude: parseFloat(row.lat),
            longitude: parseFloat(row.lon),
            speed: parseFloat(row.speed),
            course: parseFloat(row.course),
            timestamp: row.timestamp,
            isAnomaly: isAnomaly,
            reason: isAnomaly ? "aomalous behaviour detected by Isolation Forest" : undefined,
          };

          if (isAnomaly) {
            console.warn(`anomaly detected for vessel ${shipData.shipId}`);
          }

          io.emit("ais-data", shipData);
          console.log("emitting AIS data to frontend:", shipData);

          if (isAnomaly) anomalies.push(shipData);
        })
        .on("end", () => {
          if (anomalies.length === 0) {
            console.log("no anomalies found in this cycle.");
          }

          fs.writeFileSync(livePath, "mmsi,lat,lon,speed,course,timestamp\n");
          console.log("live_ais_data.csv cleared for next cycle");
          csvHeaderWritten = false;
        });
    });
  }, 2 * 60 * 1000 / 8); // every 2 minutes
};
