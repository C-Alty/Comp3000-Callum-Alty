import os
import pandas as pd
from pyais import decode

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw_data_path = os.path.join('AIS_CAPTURE_raw_31012025.txt')
cleaned_data_path = os.path.join(root_dir, 'ml_model', 'cleaned_ais_data.csv')

ais_data = []
with open(raw_data_path, 'r') as file:
    for line in file:
        line = line.strip()
        try:
            decoded_msg = decode(line)
            if hasattr(decoded_msg, 'lat') and hasattr(decoded_msg, 'lon'):
                if decoded_msg.lat is not None and decoded_msg.lon is not None:
                    ais_data.append({
                        'mmsi': getattr(decoded_msg, 'mmsi', None),
                        'lat': decoded_msg.lat,
                        'lon': decoded_msg.lon,
                        'speed': getattr(decoded_msg, 'speed', None),
                        'course': getattr(decoded_msg, 'course', None),
                        'timestamp': getattr(decoded_msg, 'timestamp', None)
                    })
        except Exception as e:
            continue

if ais_data:
    df = pd.DataFrame(ais_data)
    df.to_csv(cleaned_data_path, index=False)
    print(f"cleaned AIS data saved to {cleaned_data_path}")
else:
    print("no AIS messages with lat/lon found.")  #debugging
