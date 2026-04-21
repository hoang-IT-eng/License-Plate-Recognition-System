import cv2
from ultralytics import YOLO
from detect import read_plate_text
import os

WEIGHTS = os.path.join(os.path.dirname(__file__), "runs/detect/runs/license_plate-6/weights/best.pt")

model = YOLO(WEIGHTS)

cap = cv2.VideoCapture(0)  # 0 = webcam mặc định, đổi thành 1, 2... nếu có nhiều cam
if not cap.isOpened():
    print("Không mở được camera!")
    exit()

print("Nhấn Q để thoát")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame, conf=0.5, device=0, verbose=False)[0]

    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        conf = float(box.conf[0])

        plate_crop = frame[y1:y2, x1:x2]
        if plate_crop.size == 0:
            continue

        text = read_plate_text(plate_crop)

        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label = f"{text} ({conf:.2f})"
        cv2.putText(frame, label, (x1, y1 - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

    cv2.imshow("License Plate - Press Q to quit", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
