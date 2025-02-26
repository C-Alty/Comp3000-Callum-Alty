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

    console.log("map i!");
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
  if (!data || !data.shipId || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    console.warn("invalid data received:", data);
    return;
  }

  const { shipId, latitude, longitude } = data;

  if (!window.map || typeof window.map.addLayer !== "function") {
    console.error("leaflet map not initialized correctly");
    return;
  }

  if (markers[shipId]) {
    markers[shipId].setLatLng([latitude, longitude]);
  } else {
    const marker = L.marker([latitude, longitude])
      .addTo(window.map)
      .bindTooltip(`Ship ID: ${shipId}`, { permanent: false, direction: "top" });

    marker.on("click", () => {
      document.getElementById("vessel-id").textContent = `Ship ID: ${shipId}`;
      document.getElementById("vessel-lat").textContent = `Latitude: ${latitude.toFixed(5)}`;
      document.getElementById("vessel-lon").textContent = `Longitude: ${longitude.toFixed(5)}`;
    });

    markers[shipId] = marker;
  }
});
