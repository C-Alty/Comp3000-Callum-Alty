
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");

  try {
    window.map = L.map("map", {
        center: [0, 0],
        zoom: 2,
        zoomControl: true, 
        scrollWheelZoom: true, 
        doubleClickZoom: true, 
      });
      

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      noWrap: true, 
    }).addTo(window.map);

    window.map.setMaxBounds([
      [-90, -180],  
      [90, 180]     
    ]);

    window.map.on("drag", function () {
      window.map.panInsideBounds([
        [-90, -180],
        [90, 180]
      ], { animate: false });
    });

    console.log(" map initialized!");
  } catch (error) {
    console.error("failed to initialize:", error);
  }
});

const markers = {};
const socket = io();
socket.on("connect", () => {
  console.log("WebSocket Connected");
});

socket.on("connect_error", (error) => {
  console.error("WebSocket Connection Error:", error);
});

socket.on("disconnect", () => {
  console.warn("WebSocket Disconnected");
});

socket.on("ais-data", (data) => {
  //console.log("Received AIS Data:", data); //ais data for debugging

  if (!data || !data.shipId || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    console.warn("Invalid data received:", data);
    return;
  }

  const { shipId, latitude, longitude } = data;
  if (!window.map || typeof window.map.addLayer !== "function") {
    console.error("leaflet map not defined correctly - this will automatically retry");
    return;
  }

  // checks if a ship is already on the map and will update position instead if it is
  if (markers[shipId]) {
    markers[shipId].setLatLng([latitude, longitude]);
    console.log(`updated ship ${shipId} to [${latitude}, ${longitude}]`);
  } else {
    const marker = L.marker([latitude, longitude])
      .addTo(window.map)
      .bindPopup(`ship ID: ${shipId}`);

    markers[shipId] = marker; 
    console.log(`new ship ${shipId} at [${latitude}, ${longitude}]`);
  }
});
