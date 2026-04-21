from ultralytics import YOLO
import os

DATA_YAML = os.path.join(os.path.dirname(__file__), "data_obb.yaml")

def train():
    model = YOLO("yolov8n-obb.pt")  # OBB model
    results = model.train(
        data=DATA_YAML,
        epochs=50,
        imgsz=640,
        batch=8,
        name="license_plate_obb",
        project="runs",
        patience=10,
        save=True,
        device=0,
        workers=0,
        amp=False,
    )
    print(f"\nTraining done. Best weights: runs/license_plate_obb/weights/best.pt")

if __name__ == "__main__":
    train()
