import cv2
import easyocr
import numpy as np
from ultralytics import YOLO
import argparse
import os

# Khởi tạo OCR reader (chỉ load 1 lần)
reader = easyocr.Reader(['en'], gpu=True)


def preprocess_plate(img):
    """Tăng chất lượng ảnh biển số trước khi OCR."""
    # Crop bỏ 5% viền xung quanh để loại đường viền biển số
    h, w = img.shape[:2]
    pad_y, pad_x = int(h * 0.05), int(w * 0.05)
    img = img[pad_y:h-pad_y, pad_x:w-pad_x]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Tăng contrast
    gray = cv2.equalizeHist(gray)
    # Resize lớn hơn để OCR dễ đọc hơn
    h, w = gray.shape
    gray = cv2.resize(gray, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
    return gray


def read_plate_text(plate_img):
    """Dùng EasyOCR đọc text từ ảnh biển số đã crop."""
    processed = preprocess_plate(plate_img)
    results = reader.readtext(
        processed,
        allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        paragraph=False,
        width_ths=0.9,   # gộp các box gần nhau trên cùng dòng
        ycenter_ths=0.3, # ngưỡng xác định cùng dòng
    )
    if not results:
        return ""

    # Lấy chiều cao ảnh để xác định ngưỡng dòng
    h = processed.shape[0]
    mid_y = h / 2

    # Tách thành 2 dòng dựa theo tọa độ Y trung tâm của bbox
    top_line = [r for r in results if (r[0][0][1] + r[0][2][1]) / 2 < mid_y]
    bot_line = [r for r in results if (r[0][0][1] + r[0][2][1]) / 2 >= mid_y]

    # Sort từng dòng theo X
    top_line.sort(key=lambda x: x[0][0][0])
    bot_line.sort(key=lambda x: x[0][0][0])

    text = "".join([r[1] for r in top_line + bot_line])
    # Lọc chỉ giữ chữ và số
    text = "".join(c for c in text if c.isalnum())
    return text.upper()


def detect_and_read(image_path, model, conf=0.5, show=False, save_dir=None):
    """
    Detect biển số trong ảnh và đọc text.
    Trả về list các dict: {'bbox': [...], 'text': '...', 'conf': float}
    """
    img = cv2.imread(image_path)
    if img is None:
        print(f"Không đọc được ảnh: {image_path}")
        return []

    results = model(img, conf=conf, device=0)[0]
    detections = []

    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        confidence = float(box.conf[0])

        # Crop vùng biển số
        plate_crop = img[y1:y2, x1:x2]
        if plate_crop.size == 0:
            continue

        text = read_plate_text(plate_crop)
        detections.append({
            'bbox': [x1, y1, x2, y2],
            'text': text,
            'conf': confidence
        })

        # Vẽ lên ảnh
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label = f"{text} ({confidence:.2f})"
        cv2.putText(img, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    if show:
        cv2.imshow("License Plate Detection", img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    if save_dir:
        os.makedirs(save_dir, exist_ok=True)
        out_path = os.path.join(save_dir, os.path.basename(image_path))
        cv2.imwrite(out_path, img)
        print(f"Saved: {out_path}")

    return detections


def main():
    parser = argparse.ArgumentParser(description="License Plate Detection + OCR")
    parser.add_argument("--weights", default="runs/detect/runs/license_plate-6/weights/best.pt", help="Path to YOLOv8 weights")
    parser.add_argument("--source", required=True, help="Image path hoặc folder")
    parser.add_argument("--conf", type=float, default=0.5, help="Confidence threshold")
    parser.add_argument("--show", action="store_true", help="Hiển thị ảnh kết quả")
    parser.add_argument("--save-dir", default="output", help="Thư mục lưu ảnh kết quả")
    args = parser.parse_args()

    model = YOLO(args.weights)

    # Xử lý folder hoặc single image
    if os.path.isdir(args.source):
        exts = ('.jpg', '.jpeg', '.png', '.bmp')
        images = [os.path.join(args.source, f) for f in os.listdir(args.source) if f.lower().endswith(exts)]
    else:
        images = [args.source]

    for img_path in images:
        detections = detect_and_read(img_path, model, conf=args.conf, show=args.show, save_dir=args.save_dir)
        print(f"\n{img_path}:")
        if detections:
            for d in detections:
                print(f"  Biển số: {d['text']}  (conf: {d['conf']:.2f})")
        else:
            print("  Không phát hiện biển số")


if __name__ == "__main__":
    main()
