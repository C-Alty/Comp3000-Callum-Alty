document.addEventListener("DOMContentLoaded", () => {
  console.log("🌍 Initializing Map...");

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
      [90, 180],
    ]);

    window.map.on("drag", function () {
      window.map.panInsideBounds(
        [
          [-90, -180],
          [90, 180],
        ],
        { animate: false }
      );
    });

    console.log("map initialized!");
  } catch (error) {
    console.error("failed to initialize map:", error);
  }
});

const markers = {};
console.log("loaded");
const socket = io("http://localhost:3000", {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5, 
});

socket.on("connect", () => {
  console.log("websocket connected");
});

socket.on("connect_error", (error) => {
  console.error("webSocket connection error:", error);
});

socket.on("disconnect", () => {
  console.warn("webSocket disconnected");
});

const normalIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const anomalyIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-red.png", // red
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

socket.on("ais-data", (data) => {
  if (!data || !data.shipId || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    console.warn("invalid data received:", data);
    return;
  }

  const { shipId, latitude, longitude } = data;

  if (!window.map || typeof window.map.addLayer !== "function") {
    console.error("leaflet map not initialized");
    return;
  }

  if (markers[shipId]) {
    markers[shipId].setLatLng([latitude, longitude]);
    console.log(`updated ship ${shipId} to [${latitude}, ${longitude}]`);
  } else {
    // blue
    const marker = L.marker([latitude, longitude], { icon: normalIcon })
      .addTo(window.map)
      .bindPopup(`Ship ID: ${shipId}`);

    markers[shipId] = marker;
    console.log(`new ship ${shipId} at [${latitude}, ${longitude}]`);
  }
});

socket.on("anomaly-alert", (data) => {
  console.warn(`Anomaly detected for Ship ${data.shipId}`);

  if (markers[data.shipId]) {
    markers[data.shipId].setIcon(anomalyIcon);
    markers[data.shipId].bindPopup(`anomalous ship ID: ${data.shipId}`).openPopup();
  }
});
