document.addEventListener("DOMContentLoaded", () => {
  console.log("initializing map");

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
const socket = io();

socket.on("connect", () => {
  console.log("websocket connected");
});

socket.on("connect_error", (error) => {
  console.error("websocket connection error:", error);
});

socket.on("disconnect", () => {
  console.warn("websocket disconnected");
});

socket.on("ais-data", (data) => {
  console.log("received AIS data:", data);

  if (!data || !data.shipId || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    console.warn("invalid data received:", data);
    return;
  }

  const { shipId, latitude, longitude } = data;
  const tooltipContent = `🚢 Ship ID: ${shipId} <br> 📍 Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`; //shown on the map

  if (!window.map || typeof window.map.addLayer !== "function") {
    console.error("leaflet map not initialized correctly");
    return;
  }

  if (markers[shipId]) {
    markers[shipId].setLatLng([latitude, longitude]);
    markers[shipId].bindTooltip(tooltipContent).openTooltip();
    console.log(`updated Ship ${shipId} to [${latitude}, ${longitude}]`);
  } else {
    const marker = L.marker([latitude, longitude])
      .addTo(window.map)
      .bindTooltip(tooltipContent, { permanent: false, direction: "top" });

    markers[shipId] = marker;
    console.log(`new ship ${shipId} at [${latitude}, ${longitude}]`);
  }
});

socket.on("anomaly-alert", (data) => {
  console.warn(`anomaly detected for ship ${data.shipId}`);

  if (markers[data.shipId]) {
    markers[data.shipId].setIcon(
      L.divIcon({
        className: "anomaly-marker",
        html: "🚨",
        iconSize: [25, 25],
      })
    );

    markers[data.shipId].bindPopup(`anomalous ship ID: ${data.shipId}`).openPopup();
  }
});

// search
document.getElementById("search-button").addEventListener("click", () => {
  const searchInput = document.getElementById("search-input").value.trim();

  if (!searchInput) {
    alert("Please enter a Ship ID.");
    return;
  }

  if (markers[searchInput]) {
    const shipMarker = markers[searchInput];
    window.map.setView(shipMarker.getLatLng(), 10);
    shipMarker.openPopup();
  } else {
    alert("Ship ID not found on the map.");
  }
});
