import sys
import json
import numpy as np
import pandas as pd
import joblib

# Load trained model
model_path = "ml_model/ais_anomaly_model.pkl"
try:
    model = joblib.load(model_path)
    print(json.dumps({"status": "model loaded"}))
    sys.stdout.flush()
except Exception as e:
    print(json.dumps({"error": f"failed to load model: {e}"}))
    sys.stdout.flush()
    sys.exit(1)

FEATURE_COLUMNS = ["latitude", "longitude", "speed", "course", "speed_diff", "course_diff"]

def detect_anomaly(input_data):
    try:
        if not input_data.strip():
            return json.dumps({"error": "No input data provided"})

        data = json.loads(input_data.strip())
        feature_vector = pd.DataFrame([[
            data.get("latitude", 0),
            data.get("longitude", 0),
            data.get("speed", 0),
            data.get("course", 0),
            data.get("speed_diff", 0),
            data.get("course_diff", 0)
        ]], columns=FEATURE_COLUMNS)

        prediction = model.predict(feature_vector)
        is_anomaly = bool(prediction[0] == -1)

        result = json.dumps({"isAnomaly": is_anomaly})
        print(result)
        sys.stdout.flush()

        return result

    except Exception as e:
        error_msg = json.dumps({"error": str(e)})
        print(error_msg)
        sys.stdout.flush()
        return error_msg
for line in sys.stdin:
    json_output = detect_anomaly(line)
    print(json_output)
    sys.stdout.flush()
