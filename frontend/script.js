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

    window.map.on("drag", function () {
      window.map.panInsideBounds(
        [
          [-90, -180],
          [90, 180],
        ],
        { animate: false }
      );
    });

    console.log("✅ Map Initialized!");
  } catch (error) {
    console.error("❌ Failed to initialize map:", error);
  }

  // Add the "Simulate Anomaly" button
  const button = document.createElement("button");
  button.id = "simulate-anomaly-button";
  button.textContent = "Simulate Anomaly";
  button.style.position = "absolute";
  button.style.top = "10px";
  button.style.right = "10px";
  button.style.padding = "10px";
  button.style.backgroundColor = "#ff0000";
  button.style.color = "white";
  button.style.border = "none";
  button.style.cursor = "pointer";
  document.body.appendChild(button);

  button.addEventListener("click", simulateAnomaly);
});

// Store markers by ship ID
const markers = {};
const socket = io();

socket.on("connect", () => {
  console.log("🔗 WebSocket Connected");
});

socket.on("connect_error", (error) => {
  console.error("❌ WebSocket Connection Error:", error);
});

socket.on("disconnect", () => {
  console.warn("⚠️ WebSocket Disconnected");
});

// Handle AIS Data
socket.on("ais-data", (data) => {
  if (!data || !data.shipId || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    console.warn("⚠️ Invalid data received:", data);
    return;
  }

  const { shipId, latitude, longitude, isAnomaly, reason, ...restData } = data;

  if (!window.map || typeof window.map.addLayer !== "function") {
    console.error("❌ Leaflet map not initialized correctly");
    return;
  }

  // Set marker color based on anomaly status
  const markerIcon = L.icon({
    iconUrl: isAnomaly ? "red-marker.png" : "blue-marker.png", // Ensure these images exist!
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });

  if (markers[shipId]) {
    markers[shipId].setLatLng([latitude, longitude]);
  } else {
    const marker = L.marker([latitude, longitude], { icon: markerIcon })
      .addTo(window.map)
      .bindTooltip(`Ship ID: ${shipId}`, { permanent: false, direction: "top" });

    marker.on("click", () => {
      updateVesselInfo(shipId, latitude, longitude, { isAnomaly, reason, ...restData });
    });

    markers[shipId] = marker;
  }
});

// Update vessel details panel
function updateVesselInfo(shipId, latitude, longitude, data) {
  const vesselDetails = document.getElementById("vessel-details");

  vesselDetails.innerHTML = `
    <p><strong>Ship ID:</strong> ${shipId}</p>
    <p><strong>Latitude:</strong> ${latitude.toFixed(5)}</p>
    <p><strong>Longitude:</strong> ${longitude.toFixed(5)}</p>
  `;

  if (data.isAnomaly) {
    vesselDetails.innerHTML += `<p><strong>⚠️ Anomaly Detected:</strong> ${data.reason || "Unknown reason"}</p>`;
  }

  Object.keys(data).forEach((key) => {
    if (key !== "isAnomaly" && key !== "reason") {
      const value = data[key];
      const dataItem = document.createElement("p");
      dataItem.innerHTML = `<strong>${key}:</strong> ${typeof value === "object" ? JSON.stringify(value, null, 2) : value}`;
      vesselDetails.appendChild(dataItem);
    }
  });
}

// Search Functionality (Fixed)
document.getElementById("search-button").addEventListener("click", () => {
  const searchInput = document.getElementById("search-input").value.trim();

  if (!searchInput) {
    alert("Please enter a Ship ID.");
    return;
  }

  if (markers[searchInput]) {
    const shipMarker = markers[searchInput];

    window.map.setView(shipMarker.getLatLng(), 10);
    shipMarker.openTooltip();

    updateVesselInfo(searchInput, shipMarker.getLatLng().lat, shipMarker.getLatLng().lng, {});  
  } else {
    alert("Ship ID not found on the map.");
  }
});

// 🚨 Simulate Anomaly Button Function
function simulateAnomaly() {
  const fakeShip = {
    shipId: "999999",
    latitude: 36,  // Corrected to be inside the map bounds
    longitude: -5, // Near Strait of Gibraltar
    speed: 200,    // Abnormally high speed
    course: 0,     // Edge case course
    speed_diff: 50, 
    course_diff: 90,
    isAnomaly: true,
    reason: "⚠️ Unusual high speed & abnormal location"
  };

  console.log("🚨 Simulated Anomaly:", fakeShip);

  // Create red marker for anomaly
  const markerIcon = L.icon({
    iconUrl: "red-marker.png", // Ensure this image exists!
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });

  const marker = L.marker([fakeShip.latitude, fakeShip.longitude], { icon: markerIcon })
    .addTo(window.map)
    .bindTooltip(`Fake Ship ${fakeShip.shipId}`, { permanent: false, direction: "top" });

  markers[fakeShip.shipId] = marker;

  marker.on("click", () => {
    updateVesselInfo(
      fakeShip.shipId,
      fakeShip.latitude,
      fakeShip.longitude,
      { reason: fakeShip.reason, speed: fakeShip.speed, course: fakeShip.course }
    );
  });
}

// 🚢 Handle boat click for honk & smoke
document.addEventListener("DOMContentLoaded", () => {
  const boat = document.getElementById("boat");

  boat.addEventListener("click", () => {
    const honkSound = new Audio("honk.mp3");
    honkSound.volume = 0.1;
    honkSound.play();

    for (let i = 0; i < 3; i++) {
      createSmoke(i * 15);
    }
  });

  function createSmoke(offsetX) {
    const smoke = document.createElement("div");
    smoke.className = "smoke";

    const boatRect = boat.getBoundingClientRect();
    smoke.style.left = `${boatRect.left + boat.width / 2 + offsetX}px`;
    smoke.style.bottom = `${window.innerHeight - boatRect.top}px`;

    document.body.appendChild(smoke);

    setTimeout(() => {
      smoke.remove();
    }, 2000);
  }
});
