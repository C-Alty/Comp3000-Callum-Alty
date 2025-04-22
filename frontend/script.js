document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing map");

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

    window.map.on("drag", () => {
      window.map.panInsideBounds([[-90, -180], [90, 180]], {
        animate: false,
      });
    });

    // Cluster group
    window.clusterGroup = L.markerClusterGroup();
    window.map.addLayer(window.clusterGroup);

    // Anomaly toggle
    window.anomalousOnlyToggle = L.control({ position: "topright" });
    window.anomalousOnlyToggle.onAdd = function () {
      const container = L.DomUtil.create("div", "leaflet-control leaflet-bar anomaly-toggle-container");
      L.DomEvent.disableClickPropagation(container);
      container.innerHTML = `
        <div class="anomaly-toggle-content">
          <label class="switch">
            <input type="checkbox" id="anomaly-toggle">
            <span class="slider round"></span>
          </label>
          <span class="anomaly-toggle-label">Show only anomalies</span>
        </div>
      `;
      return container;
    };
    window.anomalousOnlyToggle.addTo(window.map);

    console.log("map initialized!");
  } catch (error) {
    console.error("failed to initialize map:", error);
  }

  const button = document.createElement("button");
  button.id = "simulate-anomaly-button";
  button.textContent = "Simulate Anomaly";
  button.style.position = "absolute";
  button.style.top = "10px";
  button.style.right = "10px";
  button.style.padding = "10px";
  button.style.backgroundColor = "#D27936";
  button.style.color = "white";
  button.style.border = "none";
  button.style.cursor = "pointer";
  document.body.appendChild(button);

  button.addEventListener("click", simulateAnomaly);
});

const markers = {};
const socket = io();

socket.on("connect", () => console.log("websocket connected"));
socket.on("disconnect", () => console.warn("websocket disconnected"));
socket.on("connect_error", (err) => console.error("websocket error:", err));

socket.on("ais-data", (data) => {
  if (!data || !data.shipId || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    console.warn("invalid AIS data:", data);
    return;
  }

  const { shipId, latitude, longitude, isAnomaly, reason, ...restData } = data;

  const markerIcon = L.icon({
    iconUrl: isAnomaly ? "red-marker.png" : "blue-marker.png",
    iconSize: [10, 10],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  let marker = markers[shipId];

  if (marker) {
    marker.setLatLng([latitude, longitude]);
    marker.setIcon(markerIcon);
    marker.options.shipData = data;
    marker.options.isAnomaly = isAnomaly;
  } else {
    marker = L.marker([latitude, longitude], {
      icon: markerIcon,
      shipData: data,
      isAnomaly: isAnomaly,
    }).bindTooltip(
      `<strong>${data.shipName || "Unknown"}</strong><br>${shipId}`,
      {
        permanent: false,
        direction: "top",
        offset: [-6, -37],
      }
    );

    marker.on("click", () => {
      updateVesselInfo(shipId, latitude, longitude, {
        isAnomaly,
        reason,
        ...restData,
      });
    });

    markers[shipId] = marker;
  }

  const onlyAnomalies = document.getElementById("anomaly-toggle")?.checked;

  if (!onlyAnomalies || isAnomaly) {
    if (!window.clusterGroup.hasLayer(marker)) {
      window.clusterGroup.addLayer(marker);
    }
  } else {
    if (window.clusterGroup.hasLayer(marker)) {
      window.clusterGroup.removeLayer(marker);
    }
  }

  if (isAnomaly) {
    console.warn(`🚨 Anomaly detected for vessel ${shipId}: ${reason || "Unknown reason"}`);
    alert(`🚨 Anomaly detected for vessel ${shipId}!`);
  }
});

// Handle anomaly toggle
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "anomaly-toggle") {
    const showOnlyAnomalies = e.target.checked;
    window.clusterGroup.clearLayers();
    Object.values(markers).forEach((marker) => {
      const isAnomaly = marker.options.isAnomaly;
      if (!showOnlyAnomalies || isAnomaly) {
        window.clusterGroup.addLayer(marker);
      }
    });
  }
});

function updateVesselInfo(shipId, lat, lon, data) {
  const vesselDetails = document.getElementById("vessel-details");
  vesselDetails.innerHTML = `
    <p><strong>Ship Name:</strong> ${data.shipName || "Unknown"}</p>
    <p><strong>Ship ID/MMSI:</strong> ${shipId}</p>
    <p><strong>Latitude:</strong> ${lat.toFixed(5)}</p>
    <p><strong>Longitude:</strong> ${lon.toFixed(5)}</p>
    <p><strong>Speed:</strong> ${data.speed ?? "Unknown"}</p>
    <p><strong>Course:</strong> ${data.course ?? "Unknown"}</p>
    ${data.isAnomaly ? `<p><strong>Anomaly detected:</strong> ${data.reason || "Unknown reason"}</p>` : ""}
  `;
}

function performSearch() {
  const input = document.getElementById("search-input").value.trim().toLowerCase();
  const banned = ["", "unknown", "null", "undefined", "none", "???"];
  if (banned.includes(input)) {
    alert("Please enter a valid Ship Name or ID.");
    return;
  }

  let found = false;

  for (const shipId in markers) {
    const marker = markers[shipId];
    if (!window.clusterGroup.hasLayer(marker)) continue;

    const data = marker.options.shipData || {};
    const matchId = String(shipId).toLowerCase() === input;
    const matchName = data.shipName && data.shipName.toLowerCase().includes(input);

    if (matchId || matchName) {
      const pos = marker.getLatLng();
      window.map.setView(pos, 10);
      marker.openTooltip();
      updateVesselInfo(shipId, pos.lat, pos.lng, data);
      found = true;
      break;
    }
  }

  if (!found) alert("No visible ship found with that MMSI or name.");
}

document.getElementById("search-button").addEventListener("click", performSearch);
document.getElementById("search-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    performSearch();
  }
});

function simulateAnomaly() {
  const fakeShip = {
    shipId: "999999999",
    latitude: 64.5,
    longitude: 10.0,
    speed: 500,
    course: 45,
    speed_diff: 200,
    course_diff: 170,
  };

  console.log("Sending simulated ship to backend:", fakeShip);
  socket.emit("simulate-ship", fakeShip);
}

// Honk + Smoke
document.addEventListener("DOMContentLoaded", () => {
  const boat = document.getElementById("boat");
  if (!boat) return;

  boat.addEventListener("click", () => {
    const honk = new Audio("honk.mp3");
    honk.volume = 0.1;
    honk.play();

    for (let i = 0; i < 3; i++) createSmoke(i * 15);
  });

  function createSmoke(offsetX) {
    const smoke = document.createElement("div");
    smoke.className = "smoke";
    const rect = boat.getBoundingClientRect();
    smoke.style.left = `${rect.left + boat.width / 2 + offsetX}px`;
    smoke.style.bottom = `${window.innerHeight - rect.top}px`;
    document.body.appendChild(smoke);
    setTimeout(() => smoke.remove(), 2000);
  }
});

socket.on("model-status", (status) => {
  const loadingContainer = document.getElementById("loading-container");
  const loadingBar = document.getElementById("loading-bar");
  const loadingText = document.getElementById("loading-text");

  if (status.running) {
    loadingContainer.style.display = "block";
    loadingText.style.display = "block";
    loadingBar.style.width = "0%";

    setTimeout(() => {
      loadingBar.style.width = "60%";
    }, 100);
  } else {
    loadingBar.style.width = "100%";
    setTimeout(() => {
      loadingContainer.style.display = "none";
      loadingText.style.display = "none";
      loadingBar.style.width = "0%";
    }, 6000);
  }
});