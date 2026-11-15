# Plates web (SaaS landing + app shell)

Static frontend for brand host `plates-ocr` (Azure App Service **F1 Free**).

- `/` — SaaS landing (hero, features, how it works, demo CTA, pricing)
- `/app/` — recognition UI shell (upload preview; live OCR via HF static Space)
- Live OCR demo: https://huyahahdq23123-plates-yolo-ocr.static.hf.space

YOLO/EasyOCR Python is **not** executed on F1. Run locally from `../license-plate-recognition/`.

## Local preview

```bash
cd web && python3 -m http.server 8765
```

## Deploy (F1)

Zip the contents of `web/` and `az webapp deploy --resource-group brands-demo-rg --name plates-ocr --src-path plates-web.zip --type zip` (or `az webapp deployment source config-zip`).
