import sys
import json
import pandas as pd
import joblib
import os

# Define paths
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(root_dir, 'ml_model', 'anomaly_detection_model.pkl')

# Load the trained model
try:
    model = joblib.load(model_path)
except Exception as e:
    print(json.dumps({"error": f"Model load failed: {str(e)}"}))
    sys.exit(1)

def predict(vessel_data):
    """
    Predict anomaly status of vessel data.
    """
    try:
        df = pd.DataFrame([vessel_data]) 
        prediction = model.predict(df[['latitude', 'longitude', 'speed', 'course']])  
        return {"MMSI": vessel_data["MMSI"], "is_anomaly": prediction[0] == -1}  # -1 means anomaly
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.stdin.read() )
        result = predict(input_data)  
        print(json.dumps(result))  
    except Exception as e:
        print(json.dumps({"error": str(e) + str(sys.stdin.read())}))