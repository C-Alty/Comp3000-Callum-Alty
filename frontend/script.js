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

// Store markers by ship ID
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

// Handle AIS Data
socket.on("ais-data", (data) => {
  if (!data || !data.shipId || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    console.warn("invalid data received:", data);
    return;
  }

  const { shipId, latitude, longitude, isAnomaly, ...restData } = data;

  console.log(`ship ID ${shipId} - Anomaly: ${isAnomaly ? "yes (RED)" : "no (BLUE)"}`);

  if (!window.map || typeof window.map.addLayer !== "function") {
    console.error("leaflet map not initialized correctly");
    return;
  }

  let markerColor = isAnomaly ? "red" : "blue"; 

  if (markers[shipId]) {
    markers[shipId].setLatLng([latitude, longitude]);
    markers[shipId].setStyle({ color: markerColor });
  } else {
    const marker = L.circleMarker([latitude, longitude], {
      color: markerColor,
      radius: 6
    })
      .addTo(window.map)
      .bindTooltip(`Ship ID: ${shipId}`, { permanent: false, direction: "top" });

    marker.on("click", () => {
      updateVesselInfo(shipId, latitude, longitude, restData);
    });

    markers[shipId] = marker;
  }
});

// Update vessel details panel
function updateVesselInfo(shipId, latitude, longitude, restData) {
  const vesselDetails = document.getElementById("vessel-details");

  // Clear previous content
  vesselDetails.innerHTML = `
    <p><strong>Ship ID:</strong> ${shipId}</p>
    <p><strong>Latitude:</strong> ${latitude.toFixed(5)}</p>
    <p><strong>Longitude:</strong> ${longitude.toFixed(5)}</p>
  `;

  Object.keys(restData).forEach((key) => {
    const value = restData[key];
    const dataItem = document.createElement("p");
    dataItem.innerHTML = `<strong>${key}:</strong> ${typeof value === "object" ? JSON.stringify(value, null, 2) : value}`;
    vesselDetails.appendChild(dataItem);
  });
}

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

// Handle boat click for honk & smoke
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
