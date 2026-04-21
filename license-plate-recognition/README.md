# License Plate Recognition - YOLOv8 + EasyOCR

## Cài đặt

```bash
pip install -r requirements.txt
```

## Cấu trúc project

```
license-plate-recognition/
├── data.yaml           # config dataset cho YOLOv8
├── train.py            # fine-tune YOLOv8
├── detect.py           # detect + OCR pipeline
├── evaluate_ocr.py     # đánh giá độ chính xác OCR
├── requirements.txt
└── runs/               # kết quả training (tự tạo sau khi train)
    └── license_plate/
        └── weights/
            └── best.pt
```

## Sử dụng

### 1. Train YOLOv8

```bash
python train.py
```

Weights tốt nhất sẽ lưu tại `runs/license_plate/weights/best.pt`

### 2. Detect + OCR

```bash
# Một ảnh
python detect.py --source path/to/image.jpg --show

# Cả folder
python detect.py --source path/to/folder --save-dir output

# Tùy chỉnh confidence
python detect.py --source image.jpg --conf 0.4 --show
```

### 3. Đánh giá OCR

```bash
python evaluate_ocr.py
```

## Dataset

- `archive (1) copy/` - dataset detect biển số (train/valid/test, format YOLO)
- `archive (1)/biensoxemayhon100bien/` - dataset OCR evaluation (ảnh crop + text label)
