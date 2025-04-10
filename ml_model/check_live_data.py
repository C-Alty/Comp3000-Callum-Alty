import pandas as pd
import joblib
import os

# Paths
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
live_data_path = os.path.join(base_dir, "live_ais_data.csv")
output_path = os.path.join(base_dir, "checked_live_ais_data.csv")
model_path = os.path.join(base_dir, "ml_model", "ais_anomaly_model.pkl")

# Load model
model = joblib.load(model_path)

# Read and clean live data
df = pd.read_csv(live_data_path, on_bad_lines='skip')

# Ensure consistent column names
df.rename(columns={
    "mmsi": "mmsi",
    "lat": "lat",
    "lon": "lon",
    "speed": "speed",
    "course": "course"
}, inplace=True)

# Sort by mmsi and timestamp if available
if "timestamp" in df.columns:
    df.sort_values(by=["mmsi", "timestamp"], inplace=True)

# Compute speed and course differences per vessel
df["speed_diff"] = df.groupby("mmsi")["speed"].diff().fillna(0)
df["course_diff"] = df.groupby("mmsi")["course"].diff().fillna(0)

# Extract features
features = df[["lat", "lon", "speed", "course", "speed_diff", "course_diff"]].fillna(0)

# Predict
df["anomaly"] = model.predict(features)

# Save
df.to_csv(output_path, index=False)
print(f"Checked {len(df)} rows and wrote to checked_live_ais_data.csv")
