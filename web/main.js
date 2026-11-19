/* ════════════════════════════════════════════════════════════════════
   PLATES — Night Checkpoint
   i18n (EN default · localStorage "plates-lang") · Lenis + GSAP scroll
   story · hero 3D hookup · capture dolly/scan/snap · clean-step canvas
   morph · split-flap resolve · pipeline highlight · magnetic + cursor.
   Motion vocabulary: dolly, snap, resolve. Nothing else moves.
   ════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var REDUCED = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCED) document.documentElement.classList.add("reduced");
  var FINE_POINTER = global.matchMedia && global.matchMedia("(pointer: fine)").matches;

  /* ───────────────────────── i18n ───────────────────────── */
  var I18N = {
    en: {
      skip: "Skip to content",
      nav_capture: "Capture", nav_clean: "Clean", nav_read: "Read", nav_demo: "Live demo", nav_how: "Pipeline",
      nav_app: "Open the app",
      hero_kicker: "ANPR · YOLOv8 + EasyOCR · Vietnam",
      hero_l1: "Read at", hero_l2: "the gate.",
      hero_sub: "A car rolls up to the camera at night. YOLOv8 finds the plate, EasyOCR reads it, a format check verifies it. This page is that single shot — told in scroll.",
      hero_cta_demo: "Run the live demo", hero_cta_repo: "Source on GitHub",
      hero_scroll: "SCROLL — THE CAR APPROACHES",
      cap_kicker: "DETECTION — YOLOv8",
      cap_title: "First, the plate is found.",
      cap_copy: "A fine-tuned YOLOv8n — one class, license_plate — scans the whole frame and locks onto the plate, ignoring headlights, grilles and wet asphalt. Nothing is read until the geometry is certain.",
      cap_readout: "CLASS license_plate · MODEL yolov8n, fine-tuned",
      cap_note: "SAMPLE FRAME — REPOSITORY TEST PHOTO, PLATE 43C-246.80 · THE V2 MODEL DETECTS ORIENTED BOXES (OBB) INSTEAD OF AXIS-ALIGNED ONES",
      clean_kicker: "PREPROCESSING — detect.py · preprocess_plate()",
      clean_title: "Then it is cleaned.",
      clean_copy: "Four operations, in the exact order the code runs them. No thresholding, no magic — the crop is trimmed, flattened to grey, contrast-equalised and enlarged so the recogniser sees glyphs, not glare.",
      clean_s1: "Crop", clean_s2: "Trim", clean_s3: "Grayscale", clean_s4: "Equalize", clean_s5: "Upscale 2×",
      clean_note: "RENDERED LIVE IN YOUR BROWSER FROM THE REAL CROP — THE SAME OPERATIONS, THE SAME ORDER",
      read_kicker: "RECOGNITION — EasyOCR",
      read_title: "Then it reads.",
      read_copy: "EasyOCR reads the cleaned crop with a strict allowlist — A–Z and 0–9 only. Two-line motorbike plates are split by line and sorted left to right before the characters are joined.",
      read_fmt_k: "FORMAT CHECK",
      read_fmt: "43 PROVINCE · C SERIES · 246.80 SERIAL — 8 GLYPHS, VIETNAMESE PATTERN",
      read_fix_k: "CONFUSION FIXES ARMED",
      read_samples: "READ FROM THE REPOSITORY'S OWN SAMPLE PHOTOS",
      read_s1: "1-LINE · CAR", read_s2: "2-LINE · MOTORBIKE", read_s3: "1-LINE · CAR · THE FRAME ABOVE",
      demo_kicker: "LIVE DEMO — IN YOUR BROWSER",
      demo_title: "Try it. Right here.",
      demo_copy: "Drop a plate photo — or use a sample — and the browser finds the plate region and reads it. Nothing is uploaded; the image never leaves your device.",
      demo_honest: "Honest label: this demo runs a lightweight browser pipeline — ROI detection + Tesseract.js. The production system reads with YOLOv8 + EasyOCR in Python (v2: OBB detection + PaddleOCR) and does not run on this static page. For the full workbench, open the app.",
      demo_drop: "Drop a plate photo, or browse",
      demo_drop_sub: "JPG / PNG · PROCESSED LOCALLY · NOTHING UPLOADED",
      demo_samples: "OR TRY A SAMPLE",
      demo_run: "Read this plate",
      demo_status_idle: "ENGINE NOT LOADED — IT LOADS ONLY WHEN YOU RUN",
      demo_status_loading: "LOADING OCR ENGINE…",
      demo_status_reading: "READING…",
      demo_status_ready: "PHOTO LOADED — PRESS READ",
      demo_status_sample: "LOADING SAMPLE…",
      demo_status_done: "DONE",
      demo_status_error: "SOMETHING FAILED — TRY AGAIN",
      demo_result_label: "RECOGNISED PLATE",
      demo_m_raw: "RAW", demo_m_roi: "ROI METHOD", demo_m_time: "TIME", demo_m_engine: "ENGINE",
      demo_err_noread: "No plate-like text was found in this photo. Try a closer, front-on shot of the plate.",
      demo_err_engine: "The OCR engine could not be loaded or failed. Check your connection and try again — or open the full app.",
      demo_err_decode: "That file could not be decoded as an image.",
      demo_full: "OPEN THE FULL WORKBENCH — DRAGGABLE ROI, CROPS, RAW PAYLOAD →",
      how_kicker: "HOW IT WORKS",
      how_title: "The pipeline, honestly.",
      how_copy: "Five stages, exactly as implemented in detect.py. A second-generation variant (detect_v2.py) swaps the detector and the reader — same road, straighter plates.",
      how_n1: "Detect", how_n2: "Crop", how_n3: "Preprocess", how_n4: "Read", how_n5: "Validate",
      how_d1: "YOLOv8n, fine-tuned on plate photos. One class: license_plate. Confidence floor 0.50.",
      how_d2: "The bounding box becomes the working image. Everything outside it is ignored from here on.",
      how_d3: "Trim 5% of the border, convert to grayscale, equalise the histogram, upscale 2× with cubic interpolation.",
      how_d4: "EasyOCR with an A–Z / 0–9 allowlist. Two-line plates are split by line centre and sorted by X before joining.",
      how_d5: "The string is checked against the Vietnamese pattern — 2 province digits, 1–2 letters, 8 glyphs — and optical confusions are repaired in digit positions.",
      how_v2: "YOLOv8-OBB predicts four corners instead of a box; a perspective warp (cv2.warpPerspective) deskews the plate flat; PaddleOCR with angle classification reads it. Built for angled checkpoint cameras.",
      how_r1: "PYTHON + GPU — cam.py READS A LIVE CAMERA FEED",
      how_r2: "BROWSER — ROI + TESSERACT.JS, ZERO SERVER (THE DEMO ABOVE)",
      how_r3: "evaluate_ocr.py SCORES OCR AGAINST A LABELLED SET OF 100+ MOTORBIKE PLATES",
      close_l1: "Built in the open.", close_l2: "Read the code.",
      close_copy: "Every step on this page maps to a function in the repository — no staged numbers, no borrowed benchmarks. If it is claimed here, it is in the code.",
      close_repo: "GitHub repository", close_app: "Open the live app",
      close_index: "← INDEX — MORE WORK BY TRẦN HUY HOÀNG",
      foot_note: "SAMPLE PHOTOS FROM THE PROJECT REPOSITORY"
    },
    vi: {
      skip: "Bỏ qua tới nội dung",
      nav_capture: "Bắt hình", nav_clean: "Làm sạch", nav_read: "Đọc", nav_demo: "Demo trực tiếp", nav_how: "Quy trình",
      nav_app: "Mở ứng dụng",
      hero_kicker: "ANPR · YOLOv8 + EasyOCR · Việt Nam",
      hero_l1: "Đọc ngay", hero_l2: "tại trạm.",
      hero_sub: "Một chiếc xe tiến vào camera trong đêm. YOLOv8 tìm biển số, EasyOCR đọc ký tự, bước kiểm tra định dạng xác thực kết quả. Trang này là chính khung hình đó — kể lại bằng thao tác cuộn.",
      hero_cta_demo: "Chạy demo trực tiếp", hero_cta_repo: "Mã nguồn trên GitHub",
      hero_scroll: "CUỘN — XE ĐANG TIẾN VÀO",
      cap_kicker: "PHÁT HIỆN — YOLOv8",
      cap_title: "Đầu tiên, biển số được tìm thấy.",
      cap_copy: "YOLOv8n đã fine-tune — một lớp duy nhất, license_plate — quét toàn bộ khung hình và khóa vào biển số, bỏ qua đèn pha, lưới tản nhiệt và mặt nhựa đường ướt. Chưa có gì được đọc cho tới khi hình học chắc chắn.",
      cap_readout: "LỚP license_plate · MÔ HÌNH yolov8n, đã fine-tune",
      cap_note: "KHUNG HÌNH MẪU — ẢNH KIỂM THỬ CỦA REPO, BIỂN 43C-246.80 · MÔ HÌNH V2 PHÁT HIỆN HỘP XOAY (OBB) THAY VÌ HỘP THẲNG",
      clean_kicker: "TIỀN XỬ LÝ — detect.py · preprocess_plate()",
      clean_title: "Rồi nó được làm sạch.",
      clean_copy: "Bốn thao tác, đúng thứ tự code thực thi. Không ngưỡng hóa, không ma thuật — vùng cắt được tỉa viền, ép sang xám, cân bằng tương phản và phóng lớn để bộ đọc nhìn thấy nét chữ, không phải ánh chói.",
      clean_s1: "Cắt", clean_s2: "Tỉa viền", clean_s3: "Xám", clean_s4: "Cân bằng sáng", clean_s5: "Phóng 2×",
      clean_note: "VẼ TRỰC TIẾP TRONG TRÌNH DUYỆT TỪ VÙNG CẮT THẬT — CÙNG THAO TÁC, CÙNG THỨ TỰ",
      read_kicker: "NHẬN DẠNG — EasyOCR",
      read_title: "Rồi nó đọc.",
      read_copy: "EasyOCR đọc vùng đã làm sạch với danh sách ký tự nghiêm ngặt — chỉ A–Z và 0–9. Biển xe máy hai dòng được tách theo dòng và sắp xếp trái sang phải trước khi ghép ký tự.",
      read_fmt_k: "KIỂM TRA ĐỊNH DẠNG",
      read_fmt: "43 MÃ TỈNH · C SERI · 246.80 SỐ — 8 KÝ TỰ, ĐÚNG MẪU VIỆT NAM",
      read_fix_k: "SỬA NHẦM LẪN ĐÃ BẬT",
      read_samples: "ĐỌC TỪ CHÍNH CÁC ẢNH MẪU CỦA REPO",
      read_s1: "1 DÒNG · Ô TÔ", read_s2: "2 DÒNG · XE MÁY", read_s3: "1 DÒNG · Ô TÔ · KHUNG HÌNH PHÍA TRÊN",
      demo_kicker: "DEMO TRỰC TIẾP — TRONG TRÌNH DUYỆT",
      demo_title: "Thử ngay. Tại đây.",
      demo_copy: "Thả một ảnh biển số — hoặc dùng ảnh mẫu — trình duyệt sẽ tìm vùng biển và đọc nó. Không có gì được tải lên; ảnh không rời khỏi thiết bị của bạn.",
      demo_honest: "Nhãn trung thực: bản demo này chạy pipeline nhẹ trong trình duyệt — phát hiện ROI + Tesseract.js. Hệ thống production đọc bằng YOLOv8 + EasyOCR trong Python (v2: phát hiện OBB + PaddleOCR) và không chạy trên trang tĩnh này. Muốn bản đầy đủ, hãy mở ứng dụng.",
      demo_drop: "Thả ảnh biển số vào đây, hoặc chọn tệp",
      demo_drop_sub: "JPG / PNG · XỬ LÝ CỤC BỘ · KHÔNG TẢI LÊN",
      demo_samples: "HOẶC THỬ ẢNH MẪU",
      demo_run: "Đọc biển số này",
      demo_status_idle: "ENGINE CHƯA TẢI — CHỈ TẢI KHI BẠN CHẠY",
      demo_status_loading: "ĐANG TẢI ENGINE OCR…",
      demo_status_reading: "ĐANG ĐỌC…",
      demo_status_ready: "ĐÃ CÓ ẢNH — NHẤN ĐỌC",
      demo_status_sample: "ĐANG TẢI ẢNH MẪU…",
      demo_status_done: "XONG",
      demo_status_error: "CÓ LỖI — THỬ LẠI",
      demo_result_label: "BIỂN SỐ NHẬN DIỆN ĐƯỢC",
      demo_m_raw: "THÔ", demo_m_roi: "PHƯƠNG PHÁP ROI", demo_m_time: "THỜI GIAN", demo_m_engine: "ENGINE",
      demo_err_noread: "Không tìm thấy chuỗi giống biển số trong ảnh này. Hãy thử ảnh chụp gần và thẳng hơn.",
      demo_err_engine: "Không tải được engine OCR hoặc engine bị lỗi. Kiểm tra kết nối rồi thử lại — hoặc mở ứng dụng đầy đủ.",
      demo_err_decode: "Tệp đó không đọc được như một ảnh.",
      demo_full: "MỞ WORKBENCH ĐẦY ĐỦ — ROI KÉO THẢ, VÙNG CẮT, PAYLOAD THÔ →",
      how_kicker: "CÁCH HOẠT ĐỘNG",
      how_title: "Pipeline, đúng như trong code.",
      how_copy: "Năm giai đoạn, đúng như đã cài đặt trong detect.py. Một biến thể thế hệ hai (detect_v2.py) thay bộ phát hiện và bộ đọc — cùng con đường, biển thẳng hơn.",
      how_n1: "Phát hiện", how_n2: "Cắt vùng", how_n3: "Tiền xử lý", how_n4: "Đọc", how_n5: "Xác thực",
      how_d1: "YOLOv8n, fine-tune trên ảnh biển số. Một lớp: license_plate. Ngưỡng tin cậy 0.50.",
      how_d2: "Khung bao trở thành ảnh làm việc. Mọi thứ ngoài khung bị bỏ qua từ đây.",
      how_d3: "Tỉa 5% viền, chuyển sang xám, cân bằng biểu đồ sáng, phóng 2× bằng nội suy cubic.",
      how_d4: "EasyOCR với danh sách cho phép A–Z / 0–9. Biển hai dòng được tách theo tâm dòng và sắp xếp theo X trước khi ghép.",
      how_d5: "Chuỗi được kiểm tra theo mẫu Việt Nam — 2 số mã tỉnh, 1–2 chữ cái, 8 ký tự — và các nhầm lẫn quang học được sửa ở vị trí số.",
      how_v2: "YOLOv8-OBB dự đoán bốn góc thay vì một hộp; phép biến đổi phối cảnh (cv2.warpPerspective) nắn biển cho phẳng; PaddleOCR với phân loại góc đọc ký tự. Sinh ra cho camera checkpoint đặt chéo.",
      how_r1: "PYTHON + GPU — cam.py ĐỌC CAMERA TRỰC TIẾP",
      how_r2: "TRÌNH DUYỆT — ROI + TESSERACT.JS, KHÔNG MÁY CHỦ (CHÍNH LÀ DEMO PHÍA TRÊN)",
      how_r3: "evaluate_ocr.py CHẤM OCR TRÊN TẬP GÁN NHÃN HƠN 100 BIỂN XE MÁY",
      close_l1: "Làm công khai.", close_l2: "Hãy đọc code.",
      close_copy: "Mỗi bước trên trang này đều ánh xạ tới một hàm trong repository — không số liệu dàn dựng, không benchmark vay mượn. Điều gì được khẳng định ở đây đều có trong code.",
      close_repo: "Kho GitHub", close_app: "Mở ứng dụng trực tiếp",
      close_index: "← MỤC LỤC — THÊM SẢN PHẨM CỦA TRẦN HUY HOÀNG",
      foot_note: "ẢNH MẪU TỪ REPOSITORY CỦA DỰ ÁN"
    }
  };

  var lang = "en";
  try {
    var saved = localStorage.getItem("plates-lang");
    if (saved === "vi" || saved === "en") lang = saved;
  } catch (e) { /* private mode */ }

  function applyLang(next) {
    lang = next;
    var dict = I18N[lang];
    document.documentElement.lang = lang;
    document.documentElement.setAttribute("data-lang", lang);
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-lang-opt]").forEach(function (el) {
      el.classList.toggle("is-on", el.getAttribute("data-lang-opt") === lang);
    });
    try { localStorage.setItem("plates-lang", lang); } catch (e) { /* ignore */ }
  }
  global.PlatesI18N = {
    t: function (key) { return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key; },
    get lang() { return lang; }
  };
  var langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.addEventListener("click", function () {
      applyLang(lang === "en" ? "vi" : "en");
    });
  }
  applyLang(lang);

  /* ───────────────── Smooth scroll + GSAP ───────────────── */
  var hasGsap = typeof global.gsap !== "undefined" && typeof global.ScrollTrigger !== "undefined";
  var lenis = null;
  if (!REDUCED && typeof global.Lenis !== "undefined") {
    lenis = new global.Lenis({ duration: 1.15, smoothWheel: true });
    if (hasGsap) {
      lenis.on("scroll", global.ScrollTrigger.update);
      global.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      global.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
    }
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
    });
  });

  function smoothstep(a, b, x) {
    var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  /* ───────────────── Hero 3D (lazy) ───────────────── */
  var heroCanvas = document.getElementById("heroCanvas");
  var heroStill = document.getElementById("heroStill");
  var threeRequested = false;
  function loadThree() {
    if (threeRequested) return;
    threeRequested = true;
    var s = document.createElement("script");
    s.src = "./assets/vendor/three.min.js";
    s.onload = function () {
      var h = document.createElement("script");
      h.src = "./hero3d.js";
      h.onload = function () {
        if (global.PlatesHero3D && global.PlatesHero3D.init(heroCanvas)) {
          heroCanvas.classList.add("is-live");
          heroVisible && global.PlatesHero3D.start();
        }
      };
      document.head.appendChild(h);
    };
    document.head.appendChild(s);
  }
  var heroVisible = true;
  var lowEnd = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  if (heroCanvas && !REDUCED && !lowEnd && "IntersectionObserver" in global) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        heroVisible = en.isIntersecting;
        if (en.isIntersecting) {
          loadThree();
          if (global.PlatesHero3D) global.PlatesHero3D.start();
        } else if (global.PlatesHero3D) {
          global.PlatesHero3D.stop();
        }
      });
    }, { threshold: 0.02 }).observe(document.getElementById("top"));
  }

  /* ───────────────── Scroll story ───────────────── */
  if (hasGsap && !REDUCED) {
    var gsap = global.gsap;
    gsap.registerPlugin(global.ScrollTrigger);
    var isMobile = global.matchMedia("(max-width: 760px)").matches;

    /* Hero dolly */
    gsap.timeline({
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=110%", scrub: 0.6, pin: true, anticipatePin: 1 }
    }).to({}, {
      duration: 1,
      onUpdate: function () {
        var p = this.progress();
        if (global.PlatesHero3D) global.PlatesHero3D.setProgress(p);
        if (heroStill && !heroCanvas.classList.contains("is-live")) {
          heroStill.style.transform = "scale(" + (1 + p * 0.1) + ")";
        }
        var readout = document.querySelector(".hero__readout");
        if (readout) readout.style.opacity = String(1 - smoothstep(0.55, 0.95, p));
        var content = document.querySelector(".hero__content");
        if (content) {
          content.style.transform = "translateY(" + (-p * 34) + "px)";
          /* The copy hands the frame to the car in the last third of the dolly. */
          content.style.opacity = String(1 - smoothstep(0.55, 1, p) * 0.82);
        }
      }
    });

    /* Capture — dolly, scan, snap */
    var capImg = document.getElementById("captureImg");
    var capBbox = document.getElementById("captureBbox");
    var capScan = document.getElementById("captureScan");
    var capReadout = document.getElementById("captureReadout");
    function renderCapture(p) {
      var zoomMax = isMobile ? 2.0 : 2.6;
      var z = 1 + smoothstep(0, 0.52, p) * (zoomMax - 1);
      if (capImg) capImg.style.transform = "scale(" + z + ")";
      var scanT = smoothstep(0.54, 0.8, p);
      if (capScan) {
        capScan.style.opacity = (scanT > 0 && scanT < 1) ? "1" : "0";
        capScan.style.top = (62.7 + scanT * 6.5) + "%";
        capScan.style.transform = "scale(" + z + ")";
      }
      var snapT = smoothstep(0.82, 0.92, p);
      if (capBbox) {
        capBbox.style.opacity = String(snapT);
        capBbox.style.transform = "scale(" + (z * (1 + (1 - snapT) * 0.08)) + ")";
      }
      if (capReadout) capReadout.style.opacity = String(smoothstep(0.9, 1, p));
    }
    if (capImg) capImg.style.transformOrigin = "51.17% 66.07%";
    if (capScan) capScan.style.transformOrigin = "50% 50%";
    if (capBbox) capBbox.style.transformOrigin = "50% 50%";
    gsap.timeline({
      scrollTrigger: {
        trigger: "#capture", start: "top top", end: "+=150%", scrub: 0.5,
        pin: isMobile ? false : ".capture__pin", anticipatePin: 1
      }
    }).to({}, { duration: 1, onUpdate: function () { renderCapture(this.progress()); } });
    renderCapture(0);

    /* Clean — pinned morph */
    buildClean(function (render) {
      gsap.timeline({
        scrollTrigger: {
          trigger: "#clean", start: "top top", end: "+=160%", scrub: 0.5,
          pin: isMobile ? false : ".clean__pin", anticipatePin: 1
        }
      }).to({}, { duration: 1, onUpdate: function () { render(this.progress()); } });
    });

    /* Read — resolve on approach */
    gsap.timeline({
      scrollTrigger: { trigger: "#read", start: "top 65%", end: "top 20%", scrub: 0.4 }
    }).to({}, { duration: 1, onUpdate: function () { renderFlaps(this.progress()); } });
  } else {
    /* Static path: everything in its final, readable state */
    buildClean(function (render) { render(1); });
    renderFlaps(1);
    var ro = document.getElementById("captureReadout");
    if (ro) ro.style.opacity = "1";
    var bb = document.getElementById("captureBbox");
    if (bb) bb.style.opacity = "1";
  }

  /* ───────────────── Clean canvas engine ───────────────── */
  function buildClean(done) {
    var canvas = document.getElementById("cleanCanvas");
    if (!canvas) { done(function () {}); return; }
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    var stepEls = document.querySelectorAll(".clean__step");
    var img = new Image();
    img.onload = function () {
      function makeCanvas(w, h) {
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        return c;
      }
      /* The crop is cut live from the repository's sample photo, at the exact
         plate box the Capture chapter reports: [476, 561, 752, 623]. */
      var crop = makeCanvas(276, 62);
      crop.getContext("2d").drawImage(img, 476, 561, 276, 62, 0, 0, 276, 62);
      /* s0 — raw crop (276×62 native, drawn at 4×) */
      var s0 = makeCanvas(W, H);
      s0.getContext("2d").drawImage(crop, 0, 0, W, H);
      /* s1 — trim 5% border */
      var s1 = makeCanvas(W, H);
      var tw = crop.width, th = crop.height;
      s1.getContext("2d").drawImage(crop, tw * 0.05, th * 0.05, tw * 0.9, th * 0.9, 0, 0, W, H);
      /* s2 — grayscale */
      var s2 = makeCanvas(W, H);
      var c2 = s2.getContext("2d");
      c2.filter = "grayscale(1)";
      c2.drawImage(s1, 0, 0);
      c2.filter = "none";
      /* s3 — histogram equalisation (the real cv2.equalizeHist operation) */
      var s3 = makeCanvas(W, H);
      var c3 = s3.getContext("2d");
      c3.drawImage(s2, 0, 0);
      try {
        var data = c3.getImageData(0, 0, W, H);
        equalize(data);
        c3.putImageData(data, 0, 0);
      } catch (e) { /* tainted canvas — keep grayscale */ }
      /* s4 — 2× cubic upscale: down to true 496×112 then back up, smoothed */
      var s4 = makeCanvas(W, H);
      var small = makeCanvas(496, 112);
      var sc = small.getContext("2d");
      sc.imageSmoothingEnabled = true;
      sc.imageSmoothingQuality = "high";
      sc.drawImage(s3, 0, 0, 496, 112);
      var c4 = s4.getContext("2d");
      c4.imageSmoothingEnabled = true;
      c4.imageSmoothingQuality = "high";
      c4.drawImage(small, 0, 0, W, H);

      var steps = [s0, s1, s2, s3, s4];
      var lastActive = -1;
      done(function render(p) {
        var f = Math.max(0, Math.min(4, p * 4));
        var a = Math.floor(f), b = Math.min(4, a + 1), frac = f - a;
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.drawImage(steps[a], 0, 0);
        if (b !== a && frac > 0) {
          ctx.globalAlpha = frac;
          ctx.drawImage(steps[b], 0, 0);
          ctx.globalAlpha = 1;
        }
        var active = Math.round(f);
        if (active !== lastActive) {
          lastActive = active;
          stepEls.forEach(function (el, i) { el.classList.toggle("is-active", i === active); });
        }
      });
    };
    img.onerror = function () { done(function () {}); };
    img.src = "./assets/sample-van-43c.jpg";
  }

  function equalize(imageData) {
    var d = imageData.data;
    var hist = new Array(256).fill(0);
    var n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) hist[d[i]]++;
    var cdf = new Array(256);
    var run = 0, cdfMin = 0;
    for (var v = 0; v < 256; v++) {
      run += hist[v];
      cdf[v] = run;
      if (!cdfMin && run > 0) cdfMin = run;
    }
    var lut = new Array(256);
    for (var j = 0; j < 256; j++) {
      lut[j] = Math.round(((cdf[j] - cdfMin) / Math.max(1, n - cdfMin)) * 255);
    }
    for (var k = 0; k < d.length; k += 4) {
      d[k] = lut[d[k]];
      d[k + 1] = lut[d[k + 1]];
      d[k + 2] = lut[d[k + 2]];
    }
  }

  /* ───────────────── Split-flap resolve ───────────────── */
  var GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var flapState = { done: false };
  function renderFlaps(p) {
    var board = document.getElementById("flapboard");
    if (!board) return;
    var flaps = board.querySelectorAll(".flap");
    flaps.forEach(function (flap, i) {
      var span = flap.querySelector("span");
      var final = flap.getAttribute("data-final");
      var local = Math.max(0, Math.min(1, (p * 1.35) - i * 0.055));
      if (local >= 1) {
        span.textContent = final;
        flap.classList.add("is-settled");
      } else if (local > 0) {
        flap.classList.remove("is-settled");
        var idx = Math.floor(Math.random() * GLYPHS.length);
        span.textContent = Math.random() < 0.12 ? final : GLYPHS[idx];
      }
    });
    flapState.done = p >= 1;
  }

  /* ───────────────── Pipeline highlight ───────────────── */
  var nodes = document.querySelectorAll("[data-node]");
  if (nodes.length && "IntersectionObserver" in global) {
    var pipeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var idx = Array.prototype.indexOf.call(nodes, en.target);
          setTimeout(function () { en.target.classList.add("is-lit"); }, REDUCED ? 0 : idx * 110);
          pipeIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.35 });
    nodes.forEach(function (n) { pipeIO.observe(n); });
  } else {
    nodes.forEach(function (n) { n.classList.add("is-lit"); });
  }

  /* ───────────────── Demo lazy load ───────────────── */
  var demoLoaded = false;
  function loadDemo() {
    if (demoLoaded) return;
    demoLoaded = true;
    var s = document.createElement("script");
    s.src = "./demo.js";
    document.head.appendChild(s);
  }
  var demoSection = document.getElementById("demo");
  if (demoSection && "IntersectionObserver" in global) {
    var demoIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { loadDemo(); demoIO.disconnect(); }
      });
    }, { rootMargin: "600px 0px" });
    demoIO.observe(demoSection);
  } else {
    loadDemo();
  }

  /* ───────────────── Cursor + magnetic (fine pointers) ───────────────── */
  if (FINE_POINTER && !REDUCED) {
    var cursor = document.getElementById("cursor");
    var cx = -100, cy = -100, tx = -100, ty = -100;
    document.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (cursor) cursor.classList.add("is-on");
    });
    (function cursorLoop() {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      if (cursor) cursor.style.transform = "translate(" + (cx - 0) + "px," + (cy - 0) + "px) translate(-50%,-50%)";
      requestAnimationFrame(cursorLoop);
    })();
    document.querySelectorAll("a, button, .chip, .demo__drop-label").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor && cursor.classList.add("is-hover"); });
      el.addEventListener("mouseleave", function () { cursor && cursor.classList.remove("is-hover"); });
    });
    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / r.width;
        var dy = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = "translate(" + (dx * 7) + "px," + (dy * 5) + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
