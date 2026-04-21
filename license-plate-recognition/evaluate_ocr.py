import os
import cv2
from detect import preprocess_plate, reader


def read_single_line(img):
    """Đọc OCR cho ảnh biển số đã crop sẵn (1 dòng hoặc 2 dòng nhỏ)."""
    processed = preprocess_plate(img)
    results = reader.readtext(
        processed,
        allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        paragraph=False,
        width_ths=0.9,
        ycenter_ths=0.3,
    )
    if not results:
        return ""

    # Lọc bỏ bbox rác (confidence thấp hoặc nằm quá xa vùng text chính)
    if len(results) > 1:
        # Tìm vùng Y chứa text chính (2 bbox có Y nhỏ nhất)
        results.sort(key=lambda x: (x[0][0][1] + x[0][2][1]) / 2)
        # Lấy Y center của bbox đầu tiên làm tham chiếu
        y_centers = [(r[0][0][1] + r[0][2][1]) / 2 for r in results]
        y_min = y_centers[0]
        # Lọc bỏ bbox nằm quá xa (cách bbox đầu > 2x chiều cao bbox đầu)
        h0 = results[0][0][2][1] - results[0][0][0][1]
        results = [r for r, yc in zip(results, y_centers) if yc - y_min <= h0 * 3]

    if not results:
        return ""

    # Tách 2 dòng dựa theo khoảng cách Y tương đối
    y_centers = [(r[0][0][1] + r[0][2][1]) / 2 for r in results]
    y_min, y_max = min(y_centers), max(y_centers)

    if y_max - y_min > 20:  # có 2 dòng rõ ràng
        mid_y = (y_min + y_max) / 2
        top_line = [r for r, yc in zip(results, y_centers) if yc <= mid_y]
        bot_line = [r for r, yc in zip(results, y_centers) if yc > mid_y]
    else:
        top_line = results
        bot_line = []

    top_line.sort(key=lambda x: x[0][0][0])
    bot_line.sort(key=lambda x: x[0][0][0])

    text = "".join([r[1] for r in top_line + bot_line])
    text = "".join(c for c in text if c.isalnum())
    return text.upper()


def normalize_plate(text):
    """
    Chuẩn hóa biển số Việt Nam: 2 số + 1-2 chữ + 4-5 số = 8 ký tự
    """
    CHAR_FIX = {'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'B': '8'}

    if len(text) < 7:
        return text

    # Bước 1: lấy 2 số đầu
    digits_prefix = []
    i = 0
    while i < len(text) and len(digits_prefix) < 2:
        if text[i].isdigit():
            digits_prefix.append(text[i])
        i += 1

    if len(digits_prefix) < 2:
        return text

    # Bước 2: lấy 1-2 chữ tiếp theo (bỏ qua ký tự không phải chữ/số)
    letters = []
    j = i
    while j < len(text) and len(letters) < 2:
        c = text[j]
        if c.isalpha():
            letters.append(c)
            j += 1
        elif c.isdigit():
            break  # gặp số thì dừng phần chữ
        else:
            j += 1  # bỏ qua ký tự lạ

    # Bước 3: lấy đúng (8 - 2 - len(letters)) số còn lại
    num_needed = 8 - 2 - len(letters)
    numbers = []
    k = j
    while k < len(text) and len(numbers) < num_needed:
        c = text[k]
        if c.isdigit():
            numbers.append(c)
        elif c in CHAR_FIX:
            numbers.append(CHAR_FIX[c])
        k += 1

    return "".join(digits_prefix + letters + numbers)



BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(BASE_DIR, "archive (1)", "biensoxemayhon100bien", "anh")
LABEL_DIR = os.path.join(BASE_DIR, "archive (1)", "biensoxemayhon100bien", "label")


def evaluate():
    img_files = [f for f in os.listdir(IMG_DIR) if f.lower().endswith(('.jpg', '.png'))]
    total = 0
    correct = 0
    errors = []

    for fname in img_files:
        stem = os.path.splitext(fname)[0]
        label_path = os.path.join(LABEL_DIR, stem + ".txt")
        if not os.path.exists(label_path):
            continue

        with open(label_path, 'r') as f:
            ground_truth = f.read().strip().upper()

        img = cv2.imread(os.path.join(IMG_DIR, fname))
        if img is None:
            continue

        predicted = normalize_plate(read_single_line(img))
        total += 1

        if predicted == ground_truth:
            correct += 1
        else:
            errors.append((fname, ground_truth, predicted))

    accuracy = correct / total * 100 if total > 0 else 0
    print(f"\nKết quả OCR trên {total} ảnh:")
    print(f"  Chính xác: {correct}/{total} ({accuracy:.1f}%)")

    if errors:
        print(f"\nCác trường hợp sai ({len(errors)}):")
        for fname, gt, pred in errors[:10]:  # chỉ in 10 cái đầu
            print(f"  {fname}: đúng={gt}, dự đoán={pred}")


if __name__ == "__main__":
    evaluate()
