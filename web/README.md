# Plates web (SaaS landing + live browser OCR)

Static frontend for brand host `plates-ocr` (Azure App Service **F1 Free**).

- `/` — SaaS landing (hero, features, how it works, demo CTA, pricing)
- `/app/` — recognition UI with **Tesseract.js** client-side OCR (reads File/canvas, not revoked blob URLs)
- Mirror demo: https://huyahahdq23123-plates-yolo-ocr.static.hf.space (`../hf-space/`)

YOLO/EasyOCR Python is **not** executed on F1. Run locally from `../license-plate-recognition/`.

## Local preview

```bash
cd web && node server.js
# or: python3 -m http.server 8765
```

## Deploy (F1)

Zip the contents of `web/` and deploy with the service principal:

```bash
cd web && zip -r /tmp/plates-web.zip . -x '*.git*'
az login --service-principal -u "$AZURE_CLIENT_ID" -p "$AZURE_CLIENT_SECRET" --tenant "$AZURE_TENANT_ID"
az account set --subscription "$AZURE_SUBSCRIPTION_ID"
az webapp deploy --resource-group brands-demo-rg --name plates-ocr --src-path /tmp/plates-web.zip --type zip
```
