---
title: Plates YOLO OCR
emoji: 🚘
colorFrom: yellow
colorTo: gray
sdk: static
pinned: false
license: mit
---

# Plates — browser ROI + OCR (static Space)

Client **plate ROI → preprocess → Tesseract.js on crop** (not full-frame OCR). Full YOLOv8 + EasyOCR Gradio needs HF PRO.

Detector: bright-blob + edge-window heuristics (YOLO skipped on free static).

Azure shell: https://plates-ocr.azurewebsites.net/app/
