# Plates web (SaaS landing + live browser OCR)

Static frontend for brand host `plates-ocr` (Azure App Service **F1 Free**).

- `/` — landing. The hero is **Night Chase**: a procedural rainy street in Three.js
  (`chase3d.js`, no model files) pinned for a few screens. The camera tracks one car,
  a viewfinder locks onto its plate, the plate is warped flat (CSS homography, the
  `warpPerspective` idea from `detect_v2.py`) and read on a split-flap board (`flap.js`).
  `chase.js` owns the hero: capability gate, pin, DOM layer. Reduced motion, automation,
  software/low-end GPUs and saveData get a static hero (night still + plate as text).
  QA flags: `?chase=on` forces the 3D scene (e.g. SwiftShader), `?chase=off` forces static.
- `/app/` — recognition UI: **plate ROI → preprocess → Tesseract.js on crop** (YOLO skipped on F1).
  The read lands on the same split-flap board (`../flap.js`, `../assets/flap.css`).
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
