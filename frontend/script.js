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

    window.markerClusterGroup = L.markerClusterGroup();
window.map.addLayer(window.markerClusterGroup);


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

// store markers by ship ID
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

  const { shipId, latitude, longitude, isAnomaly, reason, ...restData } = data;

  if (!window.map || typeof window.map.addLayer !== "function") {
    console.error("leaflet map not initialized correctly");
    return;
  }

  const markerIcon = L.icon({
    iconUrl: isAnomaly ? "red-marker.png" : "blue-marker.png",
    iconSize: [10, 10],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  if (markers[shipId]) {
    markers[shipId].setLatLng([latitude, longitude]);
    markers[shipId].setIcon(markerIcon);
    markers[shipId].options.shipData = data; 
  } else {
    const marker = L.marker([latitude, longitude], {
      icon: markerIcon,
      shipData: data,
    })
      .addTo(window.map)
      .bindTooltip(`<strong>${data.shipName || "Unknown"}</strong><br>${shipId}`, {
        permanent: false,
        direction: "top",
        offset: [-6, -37],
      });
      

    marker.on("click", () => {
      updateVesselInfo(shipId, latitude, longitude, { isAnomaly, reason, ...restData });
    });

    markers[shipId] = marker;
  }

  if (isAnomaly) {
    console.warn(`🚨 Anomaly detected for vessel ${shipId}: ${reason || "Unknown reason"}`);
    alert(`🚨 Anomaly detected for vessel ${shipId}!`);
  }
});

function updateVesselInfo(shipId, latitude, longitude, data) {
  const vesselDetails = document.getElementById("vessel-details");

  vesselDetails.innerHTML = `
    <p><strong>Ship Name:</strong> ${data.shipName || "Unknown"}</p>
    <p><strong>Ship ID/MMSI:</strong> ${shipId}</p>
    <p><strong>Latitude:</strong> ${latitude.toFixed(5)}</p>
    <p><strong>Longitude:</strong> ${longitude.toFixed(5)}</p>
    <p><strong>Speed:</strong> ${data.speed ?? "Unknown"}</p>
    <p><strong>Course:</strong> ${data.course ?? "Unknown"}</p>
  `;
  

  if (data.isAnomaly) {
    vesselDetails.innerHTML += `<p><strong>Anomaly detected:</strong> ${data.reason || "Unknown reason"}</p>`;
  }
}

document.getElementById("search-button").addEventListener("click", () => {
  const searchInput = document.getElementById("search-input").value.trim().toLowerCase();

  if (!searchInput) {
    alert("Please enter a Ship Name or Ship ID.");
    return;
  }

  let found = false;

  for (const shipId in markers) {
    const marker = markers[shipId];
    const shipData = marker.options.shipData || {};

    const matchesById = shipId.toLowerCase() === searchInput;
    const matchesByName = shipData.shipName && shipData.shipName.toLowerCase().includes(searchInput);

    if (matchesById || matchesByName) {
      const position = marker.getLatLng();
      window.map.setView(position, 10);
      marker.openTooltip();

      updateVesselInfo(
        shipId,
        position.lat,
        position.lng,
        shipData
      );

      found = true;
      break;
    }
  }

  if (!found) {
    alert("No ship found matching that MMSI or name.");
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
    course_diff: 170
  };

  console.log("sending simulated ship to backend:", fakeShip);

  socket.emit("simulate-ship", fakeShip);
}

// honk + smoke
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
})
