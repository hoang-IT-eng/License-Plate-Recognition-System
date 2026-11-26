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
  /* Unified motion guard (cinematic-web skill): reduced motion OR
     automation. Every effect — Lenis, pins, reveals, 3D, veil, cursor,
     magnetic — checks this; when it is on, the page renders complete,
     stacked and readable. */
  function motionDisabled() {
    return REDUCED || !!(global.navigator && global.navigator.webdriver);
  }
  var MOTION_OFF = motionDisabled();
  if (MOTION_OFF) document.documentElement.classList.add("reduced");
  else document.documentElement.classList.add("fx");
  var FINE_POINTER = global.matchMedia && global.matchMedia("(pointer: fine)").matches;

  function afterIdle(fn) {
    if ("requestIdleCallback" in global) {
      global.requestIdleCallback(function () { fn(); }, { timeout: 1400 });
    } else {
      global.setTimeout(fn, 80);
    }
  }

  /* Hoisted: the static path calls renderFlaps(1) before the split-flap
     section below would assign these — they must exist from the start. */
  var GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var flapState = { done: false };

  /* ───────────────────────── i18n ───────────────────────── */
  var I18N = {
    en: {
      skip: "Skip to content",
      nav_capture: "Capture", nav_clean: "Clean", nav_read: "Read", nav_demo: "Live demo", nav_how: "Pipeline",
      nav_app: "Open the app",
      hero_kicker: "ANPR · YOLOv8 + EasyOCR · Vietnam",
      hero_l1: "Read it", hero_l2: "on the move.",
      hero_sub: "One car, one rainy night. The camera tracks it, locks onto the plate, lays the plate flat and reads it — the whole pipeline, told in one scroll.",
      hero_cta_demo: "Run the live demo", hero_cta_repo: "Source on GitHub",
      hero_scroll: "SCROLL — FOLLOW THE CAR", hero_cta_app: "Open the app",
      beat1_k: "01 · TRACK", beat1: "One car in the rain. The camera stays on it.",
      beat2_k: "02 · DETECT", beat2: "YOLOv8 finds the plate and locks on — headlights, glare and wet asphalt ignored.",
      beat3_k: "03 · DESKEW", beat3: "Four corners, one perspective warp: the angled plate is laid flat.",
      beat4_k: "04 · READ", beat4: "The OCR reads it glyph by glyph — PaddleOCR in v2, Tesseract.js in the browser demo.",
      chase_note: "SAMPLE PLATE FROM THE REPOSITORY · 1-LINE CAR",
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
      foot_note: "SAMPLE PHOTOS FROM THE PROJECT REPOSITORY",
      cursor_drop: "DROP IT", cursor_run: "RUN", cursor_open: "OPEN"
    },
    vi: {
      skip: "Bỏ qua tới nội dung",
      nav_capture: "Bắt hình", nav_clean: "Làm sạch", nav_read: "Đọc", nav_demo: "Demo trực tiếp", nav_how: "Quy trình",
      nav_app: "Mở ứng dụng",
      hero_kicker: "ANPR · YOLOv8 + EasyOCR · Việt Nam",
      hero_l1: "Đọc ngay", hero_l2: "khi xe chạy.",
      hero_sub: "Một chiếc xe, một đêm mưa. Camera bám theo, khoá vào biển số, nắn phẳng rồi đọc — cả pipeline kể trong một lần cuộn.",
      hero_cta_demo: "Chạy demo trực tiếp", hero_cta_repo: "Mã nguồn trên GitHub",
      hero_scroll: "CUỘN — BÁM THEO XE", hero_cta_app: "Mở ứng dụng",
      beat1_k: "01 · BÁM THEO", beat1: "Một chiếc xe giữa mưa đêm. Camera bám sát nó.",
      beat2_k: "02 · PHÁT HIỆN", beat2: "YOLOv8 tìm ra biển số và khoá chặt — bỏ qua đèn pha, ánh loá và mặt đường ướt.",
      beat3_k: "03 · NẮN PHẲNG", beat3: "Bốn góc, một phép nắn phối cảnh: biển số đang nghiêng được trải phẳng.",
      beat4_k: "04 · ĐỌC", beat4: "OCR đọc từng ký tự — PaddleOCR ở bản v2, Tesseract.js trong demo trình duyệt.",
      chase_note: "BIỂN SỐ MẪU TỪ REPO · Ô TÔ 1 DÒNG",
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
      foot_note: "ẢNH MẪU TỪ REPOSITORY CỦA DỰ ÁN",
      cursor_drop: "THẢ VÀO", cursor_run: "CHẠY", cursor_open: "MỞ"
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
    try { global.dispatchEvent(new Event("plates-lang")); } catch (e) { /* ignore */ }
  }
  global.PlatesI18N = {
    t: function (key) { return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key; },
    get lang() { return lang; }
  };
  var langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.addEventListener("click", function () {
      applyLang(lang === "en" ? "vi" : "en");
      splitHeroTitle(); /* applyLang rewrites the line text — rebuild the masks */
    });
  }
  applyLang(lang);

  /* ───────────────── Smooth scroll + GSAP ───────────────── */
  /* ONE Lenis on GSAP's ticker (skill §1), started in an idle slot so the
     first ScrollTrigger measure is not in the boot task — native scroll
     until then. */
  var hasGsap = typeof global.gsap !== "undefined" && typeof global.ScrollTrigger !== "undefined";
  var lenis = null;
  if (!MOTION_OFF && typeof global.Lenis !== "undefined") {
    afterIdle(function () {
      lenis = new global.Lenis({
        duration: 1.15,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true
      });
      if (hasGsap) {
        lenis.on("scroll", global.ScrollTrigger.update);
        global.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        global.gsap.ticker.lagSmoothing(0);
      } else {
        (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
      }
    });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: MOTION_OFF ? "auto" : "smooth" });
    });
  });

  function smoothstep(a, b, x) {
    var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  /* ───────────────── Hero: NIGHT CHASE ─────────────────
     chase.js owns the hero — capability gate, pin, Three.js scene
     (chase3d.js, loaded on demand) and the lock / deskew / split-flap
     layer. Booted here, before the other pins, so ScrollTrigger lays the
     pins out in page order. */
  var heroStill = document.getElementById("heroStill");
  if (global.PlatesChase) global.PlatesChase.boot({ motionOff: MOTION_OFF, hasGsap: hasGsap });

  /* ───────────────── Headline intro + page veil ───────────────── */
  /* Skill §4: split the hero headline into masked word spans; initial
     states are set through GSAP (never CSS), so no-JS and the static
     path show the plain text. The veil parts as soon as fonts + the
     hero frame are ready, and the intro plays behind its parting edge. */
  var heroTitle = document.querySelector(".hero__title");
  var introPlayed = false;
  var introDone = false;
  function splitHeroTitle() {
    if (!heroTitle) return;
    heroTitle.querySelectorAll(".hero__line").forEach(function (line) {
      var text = line.textContent.replace(/\s+/g, " ").trim();
      if (!text) return;
      line.textContent = "";
      var words = text.split(" ");
      words.forEach(function (word, i) {
        var mask = document.createElement("span");
        mask.className = "hero__mask";
        var w = document.createElement("span");
        w.className = "hero__word";
        w.textContent = word;
        mask.appendChild(w);
        line.appendChild(mask);
        if (i < words.length - 1) line.appendChild(document.createTextNode(" "));
      });
    });
    if (hasGsap && !MOTION_OFF) {
      global.gsap.set(heroTitle.querySelectorAll(".hero__word"), { yPercent: introPlayed ? 0 : 110 });
      if (introPlayed) heroTitle.classList.add("is-revealed");
    }
  }
  function playIntro() {
    if (introPlayed) return;
    introPlayed = true;
    if (!heroTitle) return;
    if (hasGsap && !MOTION_OFF) {
      global.gsap.to(heroTitle.querySelectorAll(".hero__word"), {
        yPercent: 0, duration: 1.05, ease: "power4.out", stagger: 0.07, delay: 0.05,
        onComplete: function () {
          introDone = true;
          heroTitle.classList.add("is-revealed");
        }
      });
      /* Safety: an interrupted tween must never leave the headline masked. */
      setTimeout(function () {
        if (!introDone) {
          global.gsap.set(heroTitle.querySelectorAll(".hero__word"), { yPercent: 0 });
          heroTitle.classList.add("is-revealed");
        }
      }, 2600);
    } else {
      heroTitle.classList.add("is-revealed");
    }
  }
  splitHeroTitle();

  var veilEl = document.getElementById("veil");
  var veilParted = false;
  var veilT0 = Date.now();
  function partVeil() {
    if (veilParted) return;
    veilParted = true;
    if (veilEl && veilEl.parentNode) {
      if (global.__veilWatchdog) { clearTimeout(global.__veilWatchdog); global.__veilWatchdog = null; }
      veilEl.classList.add("is-parted");
      setTimeout(function () {
        if (veilEl.parentNode) veilEl.parentNode.removeChild(veilEl);
      }, 800);
    }
    playIntro();
  }
  if (MOTION_OFF || !veilEl || veilEl.hidden) {
    /* Static path (or veil never armed): no veil, headline simply shown. */
    playIntro();
  } else {
    /* The veil lifts on the first rendered frame of the night street
       (or the still, on the static path) — capped below the watchdog. */
    var heroFrameReady = new Promise(function (resolve) {
      global.addEventListener("plates-chase-ready", resolve);
      if (document.documentElement.classList.contains("chase-static") && (!heroStill || heroStill.complete)) resolve();
      else if (heroStill && document.documentElement.classList.contains("chase-static")) heroStill.addEventListener("load", resolve);
      setTimeout(resolve, 2000);
    });
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.all([fontsReady, heroFrameReady]).then(partVeil);
    setTimeout(partVeil, 2300); /* belt & braces, below the 2.5 s watchdog */
  }

  /* ───────────────── Scroll story ───────────────── */
  if (hasGsap && !MOTION_OFF) {
    var gsap = global.gsap;
    gsap.registerPlugin(global.ScrollTrigger);
    var isMobile = global.matchMedia("(max-width: 760px)").matches;

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

    /* Clean — pinned morph: built on approach, see startClean() below. */

    /* Read — resolve on approach */
    gsap.timeline({
      scrollTrigger: { trigger: "#read", start: "top 65%", end: "top 20%", scrub: 0.4 }
    }).to({}, { duration: 1, onUpdate: function () { renderFlaps(this.progress()); } });
  } else {
    /* Static path: everything in its final, readable state */
    renderFlaps(1);
    var ro = document.getElementById("captureReadout");
    if (ro) ro.style.opacity = "1";
    var bb = document.getElementById("captureBbox");
    if (bb) bb.style.opacity = "1";
  }

  /* ───────────────── Clean canvas — built on approach ─────────────────
     The morph needs the 839 KB sample photo; per the performance budget
     it (and its pin) is only built when the chapter approaches, instead
     of in the boot task. Static path renders the final frame directly. */
  var cleanStarted = false;
  function startClean() {
    if (cleanStarted) return;
    cleanStarted = true;
    buildClean(function (render) {
      if (hasGsap && !MOTION_OFF) {
        gsap.timeline({
          scrollTrigger: {
            trigger: "#clean", start: "top top", end: "+=160%", scrub: 0.5,
            pin: isMobile ? false : ".clean__pin", anticipatePin: 1
          }
        }).to({}, { duration: 1, onUpdate: function () { render(this.progress()); } });
        global.ScrollTrigger.refresh();
      } else {
        render(1);
      }
    });
  }
  var cleanSection = document.getElementById("clean");
  if (cleanSection && !MOTION_OFF && "IntersectionObserver" in global) {
    var cleanIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { startClean(); cleanIO.disconnect(); }
      });
    }, { rootMargin: "120% 0px" });
    cleanIO.observe(cleanSection);
  } else {
    startClean();
  }

  /* ───────────────── Reveal on enter — ONE observer ─────────────────
     Simple reveals only (skill §4); pins and scrubs stay on
     ScrollTrigger. Under the static path everything is already visible. */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length) {
    if (MOTION_OFF || !("IntersectionObserver" in global)) {
      revealEls.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            revealIO.unobserve(en.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      revealEls.forEach(function (el) { revealIO.observe(el); });
    }
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
  /* (GLYPHS + flapState are initialised at the top of this file.) */
  function renderFlaps(p) {
    var board = document.getElementById("flapboard");
    if (!board) return;
    var flaps = board.querySelectorAll(".flap");
    flaps.forEach(function (flap, i) {
      var span = flap.querySelector("span");
      var final = flap.getAttribute("data-final");
      /* At p = 1 the board is resolved — every flap settled, no stragglers
         left on a random glyph by the stagger math. */
      var local = p >= 1 ? 1 : Math.max(0, Math.min(1, (p * 1.35) - i * 0.055));
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
          setTimeout(function () { en.target.classList.add("is-lit"); }, MOTION_OFF ? 0 : idx * 110);
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
  if (FINE_POINTER && !MOTION_OFF) {
    var cursor = document.getElementById("cursor");
    var cursorLabel = document.getElementById("cursorLabel");
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
    /* Contextual labels: elements carry data-cursor="<i18n key>". */
    var cursorKey = null;
    function setCursorLabel(key) {
      if (key === cursorKey) return;
      cursorKey = key;
      if (!cursor || !cursorLabel) return;
      if (key) {
        cursorLabel.textContent = global.PlatesI18N.t(key);
        cursor.classList.add("has-label");
      } else {
        cursor.classList.remove("has-label");
      }
    }
    document.addEventListener("mouseover", function (e) {
      var t = (e.target && e.target.closest) ? e.target.closest("[data-cursor]") : null;
      setCursorLabel(t ? t.getAttribute("data-cursor") : null);
    });
    global.addEventListener("plates-lang", function () {
      if (cursorKey && cursorLabel) cursorLabel.textContent = global.PlatesI18N.t(cursorKey);
    });
    /* Magnetic pull, hard-limited to ±6 px (skill step 8). */
    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / r.width;
        var dy = (e.clientY - r.top - r.height / 2) / r.height;
        var mx = Math.max(-6, Math.min(6, dx * 12));
        var my = Math.max(-6, Math.min(6, dy * 12));
        el.style.transform = "translate(" + mx + "px," + my + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
