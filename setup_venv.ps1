# Script tự động tạo venv Python 3.11 và cài tất cả thư viện
Write-Host "=== Tao venv Python 3.11 ===" -ForegroundColor Green

py -3.11 -m venv D:\NhanDienBienSoXe\venv

Write-Host "=== Activate venv ===" -ForegroundColor Green
& D:\NhanDienBienSoXe\venv\Scripts\Activate.ps1

Write-Host "=== Cai PyTorch GPU ===" -ForegroundColor Green
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128

Write-Host "=== Cai cac thu vien khac ===" -ForegroundColor Green
pip install ultralytics paddlepaddle paddleocr opencv-python Pillow numpy

Write-Host "=== Kiem tra ===" -ForegroundColor Green
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.cuda.is_available())"
python -c "from paddleocr import PaddleOCR; print('PaddleOCR: OK')"

Write-Host "=== Xong! ===" -ForegroundColor Green
Write-Host "De chay code, luon activate venv truoc:" -ForegroundColor Yellow
Write-Host "D:\NhanDienBienSoXe\venv\Scripts\activate" -ForegroundColor Yellow
