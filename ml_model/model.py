import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
import os

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cleaned_data_path = os.path.join('cleaned_ais_data.csv')
model_path = os.path.join('anomaly_detection_model.pkl')
df = pd.read_csv(cleaned_data_path)

features = df[['lat', 'lon', 'speed', 'course']].fillna(0)

model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
model.fit(features)
joblib.dump(model, model_path)