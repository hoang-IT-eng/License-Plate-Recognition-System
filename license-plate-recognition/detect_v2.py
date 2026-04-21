import cv2
import numpy as np
from ultralytics import YOLO
from paddleocr import PaddleOCR
import argparse
import os

# Khởi tạo PaddleOCR (chỉ load 1 lần)
ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=True, show_log=False)

OBB_WEIGHTS = "runs/detect/runs/license_plate_obb/weights/best.pt"


def order_points(pts):
    """Sắp xếp 4 điểm theo thứ tự: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def crop_obb(img, obb_points):
    """Crop và deskew vùng biển số từ OBB points."""
    pts = order_points(obb_points)
    tl, tr, br, bl = pts

    w = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
    h = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))

    dst = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(pts, dst)
    warped = cv2.warpPerspective(img, M, (w, h))
    return warped


def preprocess_plate(img):
    """Tăng chất lượng ảnh biển số trước khi OCR."""
    # Crop bỏ 5% viền
    h, w = img.shape[:2]
    pad_y, pad_x = int(h * 0.05), int(w * 0.05)
    img = img[pad_y:h-pad_y, pad_x:w-pad_x]
    if img.size == 0:
        return None
    # Resize lớn hơn
    h, w = img.shape[:2]
    img = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
    return img


def read_plate_text(plate_img):
    """Dùng PaddleOCR đọc text từ ảnh biển số."""
    processed = preprocess_plate(plate_img)
    if processed is None:
        return ""

    result = ocr.ocr(processed, cls=True)
    if not result or not result[0]:
        return ""

    lines = result[0]
    # Tách 2 dòng theo Y
    y_centers = [(line[0][0][1] + line[0][2][1]) / 2 for line in lines]
    y_min, y_max = min(y_centers), max(y_centers)

    if y_max - y_min > 20:
        mid_y = (y_min + y_max) / 2
        top = [(l, yc) for l, yc in zip(lines, y_centers) if yc <= mid_y]
        bot = [(l, yc) for l, yc in zip(lines, y_centers) if yc > mid_y]
        top.sort(key=lambda x: x[0][0][0][0])
        bot.sort(key=lambda x: x[0][0][0][0])
        ordered = [l for l, _ in top + bot]
    else:
        lines_sorted = sorted(zip(lines, y_centers), key=lambda x: x[0][0][0][0])
        ordered = [l for l, _ in lines_sorted]

    text = "".join([l[1][0] for l in ordered])
    text = "".join(c for c in text if c.isalnum())
    return text.upper()


def detect_and_read(image_path, model, conf=0.5, show=False, save_dir=None):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Không đọc được ảnh: {image_path}")
        return []

    results = model(img, conf=conf, device=0, verbose=False)[0]
    detections = []

    for obb in results.obb:
        confidence = float(obb.conf[0])
        cls_id = int(obb.cls[0])
        cls_name = model.names[cls_id]  # 'BSD' hoặc 'BSV'

        # Lấy 4 điểm góc của OBB
        pts = obb.xyxyxyxy[0].cpu().numpy().reshape(4, 2)

        # Crop deskewed
        plate_crop = crop_obb(img, pts)
        if plate_crop.size == 0:
            continue

        text = read_plate_text(plate_crop)
        detections.append({
            'points': pts,
            'text': text,
            'conf': confidence,
            'type': cls_name
        })

        # Vẽ OBB lên ảnh
        pts_int = pts.astype(int)
        cv2.polylines(img, [pts_int], True, (0, 255, 0), 2)
        label = f"{text} [{cls_name}] ({confidence:.2f})"
        cv2.putText(img, label, (pts_int[0][0], pts_int[0][1] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    if show:
        cv2.imshow("License Plate Detection v2", img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    if save_dir:
        os.makedirs(save_dir, exist_ok=True)
        out_path = os.path.join(save_dir, os.path.basename(image_path))
        cv2.imwrite(out_path, img)
        print(f"Saved: {out_path}")

    return detections


def main():
    parser = argparse.ArgumentParser(description="License Plate Detection v2 (OBB + PaddleOCR)")
    parser.add_argument("--weights", default=OBB_WEIGHTS)
    parser.add_argument("--source", required=True)
    parser.add_argument("--conf", type=float, default=0.5)
    parser.add_argument("--show", action="store_true")
    parser.add_argument("--save-dir", default="output_v2")
    args = parser.parse_args()

    model = YOLO(args.weights)

    if os.path.isdir(args.source):
        exts = ('.jpg', '.jpeg', '.png', '.bmp')
        images = [os.path.join(args.source, f) for f in os.listdir(args.source)
                  if f.lower().endswith(exts)]
    else:
        images = [args.source]

    for img_path in images:
        detections = detect_and_read(img_path, model, conf=args.conf,
                                     show=args.show, save_dir=args.save_dir)
        print(f"\n{img_path}:")
        if detections:
            for d in detections:
                print(f"  [{d['type']}] {d['text']}  (conf: {d['conf']:.2f})")
        else:
            print("  Không phát hiện biển số")


if __name__ == "__main__":
    main()
