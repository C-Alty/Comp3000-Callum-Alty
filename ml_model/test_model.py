import pandas as pd
import joblib
import os

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cleaned_data_path = os.path.join(root_dir, 'ml_model', 'cleaned_ais_data.csv')
model_path = os.path.join(root_dir, 'ml_model', 'anomaly_detection_model.pkl')

# load trained model
model = joblib.load(model_path)
print("Model loaded successfully.")

# load cleaned AIS data
df = pd.read_csv(cleaned_data_path)

# select features: lat, lon, speed, course
features = df[['lat', 'lon', 'speed', 'course']].fillna(0)

# make predictions (-1 = anomaly, 1 = normal)
df['anomaly'] = model.predict(features)

# count anomalies detected
anomalies_detected = df[df['anomaly'] == -1]
print(f"Total anomalies detected: {len(anomalies_detected)}")

# save results to a new CSV for review
test_results_path = os.path.join(root_dir, 'ml_model', 'test_results.csv')
df.to_csv(test_results_path, index=False)
print(f"Test results saved to {test_results_path}")