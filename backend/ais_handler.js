require("dotenv").config();
const WebSocket = require("ws");

module.exports = function aisHandler(io) {
  const API_KEY = process.env.AISSTREAM_API_KEY;

  if (!API_KEY) {
    console.error("error: Missing AISSTREAM_API_KEY in .env");
    return;
  }

  const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

  socket.addEventListener("open", (_) => {
    console.log("connected to AIS Stream");

    const subscriptionMessage = {
      APIkey: API_KEY,
      BoundingBoxes: [
        [
          [-180, -90],  // currently set to entire world
          [180, 90],    
        ],
      ],
    };

    socket.send(JSON.stringify(subscriptionMessage));
  });

  socket.addEventListener("error", (event) => {
    console.error("WebSocket Error:", event);
  });

  socket.addEventListener("close", () => {
    console.warn("WebSocket Connection Closed");
  });

  socket.addEventListener("message", (event) => {
    //console.log("AIS Data Received:", event.data); // raw ais data for debugging

    try {
      let aisMessage = JSON.parse(event.data);

      if (aisMessage["MessageType"] === "PositionReport") {
        let positionReport = aisMessage["Message"]["PositionReport"];
        let shipData = {
          shipId: positionReport["UserID"],
          latitude: positionReport["Latitude"],
          longitude: positionReport["Longitude"],
        };

        //console.log(`ShipId: ${shipData.shipId} Lat: ${shipData.latitude} Lon: ${shipData.longitude}`); // log output for debugging
        io.emit("ais-data", shipData);
      }
    } catch (error) {
      console.error("error parsing AIS data:", error);
    }
  });
};
