from ultralytics import YOLO
import os

DATA_YAML = os.path.join(os.path.dirname(__file__), "data.yaml")

def train():
    model = YOLO("yolov8n.pt")  # dùng nano cho nhanh, đổi sang yolov8s.pt nếu muốn chính xác hơn
    results = model.train(
        data=DATA_YAML,
        epochs=50,
        imgsz=320,         # giảm xuống 320 để tiết kiệm RAM
        amp=False,         # tắt AMP check tránh load thêm model
        batch=8,           # giảm batch size tránh CUDA OOM
        name="license_plate",
        project="runs",
        patience=10,       # early stopping nếu không cải thiện sau 10 epoch
        save=True,
        device=0,          # dùng GPU
        workers=0,         # tắt multiprocessing để tránh lỗi RAM
    )
    print(f"\nTraining done. Best weights: runs/license_plate/weights/best.pt")

if __name__ == "__main__":
    train()
