import cv2
import numpy as np
from ultralytics import YOLO
from detect_v2 import crop_obb, read_plate_text
import os

WEIGHTS = os.path.join(os.path.dirname(__file__),
                       "runs/detect/runs/license_plate_obb/weights/best.pt")

model = YOLO(WEIGHTS)

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Không mở được camera!")
    exit()

print("Nhấn Q để thoát")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame, conf=0.5, device=0, verbose=False)[0]

    for obb in results.obb:
        conf = float(obb.conf[0])
        cls_id = int(obb.cls[0])
        cls_name = model.names[cls_id]

        pts = obb.xyxyxyxy[0].cpu().numpy().reshape(4, 2)
        plate_crop = crop_obb(frame, pts)
        if plate_crop.size == 0:
            continue

        text = read_plate_text(plate_crop)

        pts_int = pts.astype(int)
        cv2.polylines(frame, [pts_int], True, (0, 255, 0), 2)
        label = f"{text} [{cls_name}] ({conf:.2f})"
        cv2.putText(frame, label, (pts_int[0][0], pts_int[0][1] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

    cv2.imshow("License Plate v2 - Press Q to quit", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
