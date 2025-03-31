import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest

# Load dataset
file_path = "cleaned_ais_data.csv"
df = pd.read_csv(file_path)

# Drop rows with missing values
df.dropna(subset=["mmsi", "lat", "lon", "speed", "course"], inplace=True)

# Ensure MMSI is valid
df["mmsi"] = df["mmsi"].astype(int)
df = df[df["mmsi"] != 0]

# Sort data to ensure correct calculations
df.sort_values(by=["mmsi", "timestamp"], inplace=True)

# Compute speed and course differences
df["speed_diff"] = df.groupby("mmsi")["speed"].diff().fillna(0)
df["course_diff"] = df.groupby("mmsi")["course"].diff().fillna(0)

# Define features for anomaly detection
features = ["lat", "lon", "speed", "course", "speed_diff", "course_diff"]
df_train = df[features]

# Train the Isolation Forest model
model = IsolationForest(n_estimators=200, contamination=0.01, random_state=42)
df["anomaly"] = model.fit_predict(df_train)

# Save model
joblib.dump(model, "ais_anomaly_model.pkl")

# Save results with anomalies
df.to_csv("ais_anomaly_results.csv", index=False)

print("model training complete. Results saved to 'ais_anomaly_results.csv'.")