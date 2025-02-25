from pyais.stream import IterMessages
import sys

def decode_ais(file_path):
    decoded_messages = []  
    with open(file_path, 'rb') as f:  
        for line in f:
            if not line.strip():  # skips the empty lines
                continue
            try:
                for msg in IterMessages([line]):
                    decoded = msg.decode()
                    
                    # debugging
                    print(f"raw AIS Message: {msg.raw}")
                    print(f"decoded Message: {decoded}")
                    
                    decoded_messages.append(decoded.asdict())
            except Exception as e:
                print(f"failed to decode message: {line.strip()}")
    
    return decoded_messages 

#for running directly
if __name__ == "__main__":
    if len(sys.argv) != 2:
    else:
        decoded_ais = decode_ais(sys.argv[1])
        for msg in decoded_ais:
            print(msg)