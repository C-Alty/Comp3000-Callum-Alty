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

    fetch('/historic_anomalies.csv')
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.trim().split("\n").slice(1); // Skip header
        const list = document.getElementById("anomaly-list");
        list.innerHTML = ""; // Clear loading...

        if (lines.length === 0) {
          list.innerHTML = "<li>No historic anomalies yet.</li>";
          return;
        }

        const seen = new Set();
        lines.reverse().forEach(line => {
          const parts = line.split(",");
          if (parts.length < 6) {
            console.warn("Skipping invalid line:", line);
            return;
          }

          const [mmsi, lat, lon, speed, course, timestamp] = parts;

          if (seen.has(mmsi)) return;
          seen.add(mmsi);

          const item = document.createElement("li");
          item.textContent = `${mmsi} @ ${parseFloat(lat).toFixed(2)}, ${parseFloat(lon).toFixed(2)} (${timestamp.split("T")[0]})`;
          list.appendChild(item);
        });
      })
      .catch(error => {
        console.error('Failed to load historic anomalies:', error);
        const list = document.getElementById("anomaly-list");
        list.innerHTML = "<li>Failed to load historic anomalies.</li>";
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

    window.clusterGroup = L.markerClusterGroup();
    window.anomalyGroup = L.layerGroup();
    window.map.addLayer(window.clusterGroup);
    window.map.addLayer(window.anomalyGroup);

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

    window.map.on("zoomend", () => {
      Object.values(markers).forEach((marker) => {
        const newIcon = getScaledIcon(marker.options.isAnomaly);
        marker.setIcon(newIcon);
      });
    });

    console.log("Map initialized!");
  } catch (error) {
    console.error("Failed to initialize map:", error);
  }

  const simulateButton = document.createElement("button");
  simulateButton.id = "simulate-anomaly-button";
  simulateButton.textContent = "Simulate Anomaly";
  simulateButton.style.padding = "10px 20px";
  simulateButton.style.marginTop = "10px";
  simulateButton.style.backgroundColor = "#ff9f43";
  simulateButton.style.color = "white";
  simulateButton.style.border = "none";
  simulateButton.style.borderRadius = "8px";
  simulateButton.style.fontFamily = "'Montserrat', sans-serif";
  simulateButton.style.fontSize = "14px";
  simulateButton.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";
  simulateButton.style.cursor = "pointer";

  simulateButton.addEventListener("mouseenter", () => {
    simulateButton.style.backgroundColor = "#8d531c";
  });
  simulateButton.addEventListener("mouseleave", () => {
    simulateButton.style.backgroundColor = "#ff9f43";
  });
  simulateButton.addEventListener("click", simulateAnomaly);

  const historicAnomaliesBox = document.getElementById("historic-anomalies");
  historicAnomaliesBox.appendChild(simulateButton);
});

const markers = {};
const socket = io();

function getScaledIcon(isAnomaly) {
  const zoom = window.map.getZoom();
  const size = Math.max(8, Math.min(zoom * 1, 18));
  return L.icon({
    iconUrl: isAnomaly ? "red-marker.png" : "blue-marker.png",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

socket.on("connect", () => console.log("WebSocket connected"));
socket.on("disconnect", () => console.warn("WebSocket disconnected"));
socket.on("connect_error", (err) => console.error("WebSocket error:", err));

socket.on("ais-data", (data) => {
  if (!data || !data.shipId || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    console.warn("Invalid AIS data:", data);
    return;
  }

  const { shipId, latitude, longitude, isAnomaly, reason, ...restData } = data;
  const markerIcon = getScaledIcon(isAnomaly);
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

  if (isAnomaly) {
    if (!window.anomalyGroup.hasLayer(marker)) {
      window.anomalyGroup.addLayer(marker);
    }
    if (window.clusterGroup.hasLayer(marker)) {
      window.clusterGroup.removeLayer(marker);
    }
  } else {
    if (onlyAnomalies) {
      if (window.clusterGroup.hasLayer(marker)) {
        window.clusterGroup.removeLayer(marker);
      }
    } else {
      if (!window.clusterGroup.hasLayer(marker)) {
        window.clusterGroup.addLayer(marker);
      }
    }
    if (window.anomalyGroup.hasLayer(marker)) {
      window.anomalyGroup.removeLayer(marker);
    }
  }

  if (isAnomaly) {
    console.warn(`🚨 Anomaly detected for vessel ${shipId}: ${reason || "Unknown reason"}`);
    alert(`🚨 Anomaly detected for vessel ${shipId}!`);
  }
});

document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "anomaly-toggle") {
    const showOnlyAnomalies = e.target.checked;
    window.clusterGroup.clearLayers();
    window.anomalyGroup.clearLayers();

    Object.values(markers).forEach((marker) => {
      const isAnomaly = marker.options.isAnomaly;
      if (isAnomaly) {
        window.anomalyGroup.addLayer(marker);
      } else if (!showOnlyAnomalies) {
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
  const resultsList = document.getElementById("search-results");
  resultsList.innerHTML = "";

  const banned = ["", "unknown", "null", "undefined", "none", "???"];
  if (banned.includes(input)) {
    resultsList.style.display = "none";
    return;
  }

  const results = [];

  for (const shipId in markers) {
    const marker = markers[shipId];
    const data = marker.options.shipData || {};
    const matchId = String(shipId).toLowerCase().includes(input);
    const matchName = data.shipName && data.shipName.toLowerCase().includes(input);

    if (matchId || matchName) {
      results.push({ marker, data, shipId });
    }
  }

  if (results.length === 0) {
    resultsList.innerHTML = "<li style='padding: 8px 12px;'>No matches found.</li>";
    resultsList.style.display = "block";
    return;
  }

  results.forEach(({ marker, data, shipId }) => {
    const li = document.createElement("li");
    li.textContent = `${data.shipName || "Unknown"} (${shipId})`;
    li.addEventListener("click", () => {
      const pos = marker.getLatLng();
      window.map.setView(pos, 10);
      marker.openTooltip();
      updateVesselInfo(shipId, pos.lat, pos.lng, data);
      resultsList.style.display = "none";
    });
    resultsList.appendChild(li);
  });

  resultsList.style.display = "block";
}

document.getElementById("search-input").addEventListener("keyup", performSearch);
document.getElementById("search-button").addEventListener("click", performSearch);
document.getElementById("search-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    performSearch();
  }
});

function simulateAnomaly() {
  const fakeShip = {
    shipName: "homnk",
    shipId: "999999999",
    latitude: 64.5,
    longitude: 10.0,
    speed: 500,
    course: 45,
    speed_diff: 500,
    course_diff: 170,
  };

  console.log("Sending simulated ship to backend:", fakeShip);
  socket.emit("simulate-ship", fakeShip);
}

// Optional: Modal help popup for info
document.addEventListener("DOMContentLoaded", () => {
  const helpButton = document.getElementById("help-button");
  const modal = document.getElementById("info-modal");
  const closeModal = document.getElementById("close-info-modal");

  if (helpButton && modal && closeModal) {
    helpButton.addEventListener("click", () => {
      modal.style.display = "block";
    });

    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  document.addEventListener("click", (e) => {
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");

    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.style.display = "none";
    }
  });
});
