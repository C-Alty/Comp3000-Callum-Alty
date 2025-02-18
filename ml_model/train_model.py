import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest

file_path = "ml_model/cleaned_ais_data.csv"
df = pd.read_csv(file_path)

# drop rows with missing values
df.dropna(subset=["mmsi", "lat", "lon", "speed", "course"], inplace=True)

df["mmsi"] = df["mmsi"].astype(int) # checks for blanks
df = df[df["mmsi"] != 0]
df["speed_diff"] = df.groupby("mmsi")["speed"].diff().fillna(0)
df["course_diff"] = df.groupby("mmsi")["course"].diff().fillna(0)
features = ["speed", "speed_diff", "course_diff"]
df_train = df[features]

# train the Isolation Forest model
model = IsolationForest(contamination=0.02, random_state=42)
df["anomaly"] = model.fit_predict(df_train)

joblib.dump(model, "ml_model/ais_anomaly_model.pkl")
df.to_csv("ml_model/ais_anomaly_results.csv", index=False)

print("results saved to 'ml_model/ais_anomaly_results.csv'.")
