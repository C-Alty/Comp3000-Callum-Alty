import pandas as pd
import joblib
import os

# File paths
input_csv = "live_ais_data.csv"
output_csv = "checked_live_ais_data.csv"
model_path = "ml_model/ais_anomaly_model.pkl"

# Load trained model
try:
    model = joblib.load(model_path)
except Exception as e:
    print(f"failed to load model: {e}")
    exit(1)

# Read live AIS data
try:
    df = pd.read_csv(input_csv)
except Exception as e:
    print(f"failed to read {input_csv}: {e}")
    exit(1)

# Check and rename columns if needed
column_mapping = {
    "shipId": "mmsi",
    "latitude": "lat",
    "longitude": "lon"
}
df.rename(columns=column_mapping, inplace=True)

# Ensure required columns exist
required_cols = ["lat", "lon", "speed", "course"]
for col in required_cols:
    if col not in df.columns:
        print(f"missing required column: {col}")
        exit(1)

# Fill missing values
df.fillna(0, inplace=True)

# Extract features
features = df[required_cols]

# Predict anomalies (-1 = anomaly, 1 = normal)
try:
    predictions = model.predict(features)
    df["anomaly"] = predictions
except Exception as e:
    print(f"error during prediction: {e}")
    exit(1)

# Save results
try:
    df.to_csv(output_csv, index=False)
    print(f"anomaly detection complete. Results saved to {output_csv}")
except Exception as e:
    print(f"failed to save output CSV: {e}")
    exit(1)
