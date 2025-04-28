# Comp3000-Callum-Alty

# Maritime Security Threat Detection
### Supervisor: Rory Hopcraft

This project is aimed at the stakeholders in maritime security, for example shipping companies in order to ensure the security of maritime activities and detect current or emerging threats. It uses live AIS data in order to detect anomalies in real time.

Trello: https://trello.com/invite/b/67193e5f71c23f8ba3c101b1/ATTI6ac076cdcac9f91573a789cac28e283169E2259E/comp-3000-callum-alty

![Gantt Chart Project Initiation](https://github.com/user-attachments/assets/878cc37f-6480-46fa-bdec-da686a011727)

## 🌟 Features

-  **Live AIS Data Feed:** Displays real-time ship locations using **Leaflet.js** and WebSockets.
-  **Anomaly Detection:** Flags ships with unusual movement patterns.
-  **Search Functionality:** Quickly locate a vessel using its **Ship ID**.
-  **Interactive UI:** Hover over a ship to view **latitude, longitude, and Ship ID**.

## 📌 How It Works

- **Ais Data Stream:** Ships are recieved via AISStream.io
- **Map Rendering:** Ships appear dynamically via Leaflet.js
- **Anomaly Detection:** The ML model - isolation forest - flags anomalies
- **User Interaction:**
  - Hover a ship to see details
  - Use the search bar to find vessels
  - Historic Anomalies are displayed for review

## 🛠️ Technologies Used
- **Frontend:** HTML, CSS, Javascript, Leaflet.js
- **Backend:** Node.js, Express, Websockets
- **Machine Learning:** Python (Pandas, Scikit-learn, NumPy)
- **Data sources:**
    - AIS stream from AISStream.io
    - Historical AIS data from University of Plymouth
- **Development Tools:**
    - Visual Studio Code, Git, GitHub
      
## 📢 IMPORTANT NOTE
- This project was developed for **academic purposes**
- It is not a certifiied security tool and should be used for educational demonstration only
  






