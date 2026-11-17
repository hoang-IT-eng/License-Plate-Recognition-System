(function () {
  "use strict";

  /* ================= i18n ================= */
  var I18N = {
    vi: {
      title: "Plates — Hệ thống nhận diện biển số xe | YOLOv8 + EasyOCR",
      meta_desc: "Plates: hệ thống nhận diện biển số xe (ANPR) dùng YOLOv8 để phát hiện và EasyOCR để đọc ký tự. Có demo chạy ngay trên trình duyệt.",
      skip: "Bỏ qua tới nội dung chính",
      brand_aria: "Plates — trang chủ",
      nav_menu: "Menu",
      nav_features: "Tính năng",
      nav_system: "Hệ thống",
      nav_cta: "Mở app nhận diện",
      eyebrow: "ANPR · NHẬN DIỆN BIỂN SỐ XE",
      h1: "Từ khung hình<br />đến <em>biển số</em>,<br />trong tích tắc.",
      lede: "Plates kết hợp <strong>YOLOv8</strong> để khoanh vùng biển số và <strong>EasyOCR</strong> để đọc ký tự — chạy trên từng ảnh, cả thư mục, hay camera trực tiếp. Không cần máy chủ GPU: bản demo đọc biển ngay trên trình duyệt của bạn.",
      cta_try: "Dùng thử demo",
      cta_how: "Xem cách hoạt động",
      stat1: "biến thể detector<br />YOLOv8 &amp; YOLOv8-OBB",
      stat2: "bước trong pipeline<br />phát hiện → kết quả",
      stat3: "cách vận hành<br />Python local · trình duyệt",
      hud_gate: "CAM 01 · CỔNG VÀO",
      scene_alt: "Minh họa khung hình camera với biển số được khoanh vùng",
      ocr_status: "ĐÃ ĐỌC XONG",
      visual_note: "Biển số trong hình là minh họa hư cấu.",
      night_h2: "Trời tối, mưa, xe chạy nhanh —<br />biển vẫn phải đọc được.",
      night_cap: "Ảnh minh họa AI: camera ANPR trên giàn cao tốc trong một đêm mưa.",
      pipe_h2: "Bốn bước từ ảnh thô<br />tới chuỗi biển số.",
      pipe_p: "Mỗi bước đều nằm trong mã nguồn Python của repo — không hộp đen, không dịch vụ trả phí.",
      s1_h: "Phát hiện <span>Detect</span>",
      s1_p: "YOLOv8 đã fine-tune trên lớp <code>license_plate</code> quét toàn khung hình và trả về hộp bao quanh biển số. Biến thể OBB trong <code>detect_v2.py</code> bắt được cả biển bị nghiêng theo góc chụp.",
      s2_h: "Cắt &amp; tiền xử lý <span>Crop · Preprocess</span>",
      s2_p: "Vùng biển được cắt theo ROI, chuyển sang ảnh xám, cân bằng histogram bằng <code>equalizeHist</code> rồi phóng lớn 2× với nội suy <code>INTER_CUBIC</code> để nét chữ sạch hơn trước khi đọc.",
      s3_h: "Đọc ký tự <span>OCR</span>",
      s3_p: "EasyOCR đọc ký tự trong danh sách cho phép <code>0–9 A–Z</code>, rồi ghép kết quả theo đúng bố cục biển số Việt Nam hai dòng — phần số seri và phần số thứ tự không bị lẫn vào nhau.",
      s4_h: "Kết quả &amp; kiểm chứng <span>Result · Evaluate</span>",
      s4_p: "Chuỗi biển số hoàn chỉnh sẵn sàng cho cổng barrier, bãi xe hay danh sách theo dõi. Script <code>evaluate_ocr.py</code> chấm OCR trên tập ảnh crop có nhãn để đo và cải tiến qua từng vòng.",
      feat_kicker: "02 — Tính năng",
      feat_h2: "Đủ cho một hệ thống ANPR thật,",
      feat_p: "không chỉ là một bản demo trình diễn.",
      f1_h: "Hai detector song song",
      f1_p: "Weights <code>yolov8n.pt</code> cho biển thẳng và <code>yolov8n-obb.pt</code> cho biển nghiêng — chọn model theo góc camera thực tế của bạn.",
      f2_h: "Tiền xử lý chuyên cho OCR",
      f2_p: "Cân bằng sáng và phóng nét 2× ngay trong pipeline, giúp OCR đọc ổn định hơn trên ảnh mờ, thiếu sáng hay chụp từ xa.",
      f3_h: "Hiểu biển số Việt Nam",
      f3_p: "Ghép hai dòng theo bố cục biển Việt, allowlist chỉ gồm chữ và số nên kết quả ít nhiễu ký tự lạ.",
      f4_h: "Camera trực tiếp &amp; xử lý hàng loạt",
      f4_p: "<code>cam.py</code> đọc biển từ webcam theo thời gian thực; <code>detect.py</code> quét cả thư mục ảnh và lưu kết quả theo lô.",
      f5_h: "Vòng lặp đánh giá khép kín",
      f5_p: "Dataset crop kèm nhãn text để chấm điểm OCR sau mỗi lần đổi model hay thông số — cải tiến luôn có căn cứ từ chính dữ liệu của bạn.",
      f6_h: "Demo chạy ngay trên trình duyệt",
      f6_p: "Bản web tự khoanh vùng biển (ROI), tiền xử lý và đọc bằng Tesseract.js phía client — mở trang là thử được, không cần cài Python.",
      sys_kicker: "03 — Kiến trúc",
      sys_h2: "Một pipeline, hai mặt trận.",
      sys_p: "Python đảm nhiệm độ chính xác ở máy local; bản web đảm nhiệm việc ai cũng chạm vào được. Cả hai dùng chung một tư duy: khoanh vùng trước, đọc sau.",
      fig1_alt: "Sơ đồ pipeline: khung hình → YOLOv8 khoanh biển → tiền xử lý → EasyOCR",
      fig1_cap: "Pipeline xử lý: khung hình → hộp biển số → tiền xử lý → chuỗi ký tự.",
      fig2_alt: "Sơ đồ kiến trúc tổng thể của hệ thống Plates",
      fig2_cap: "Kiến trúc tổng thể: local Python, web app và bản mirror trên Hugging Face.",
      repo_detect: "phát hiện + OCR",
      repo_obb: "biến thể OBB",
      repo_cam: "camera trực tiếp",
      repo_eval: "đánh giá OCR",
      repo_web: "demo trình duyệt",
      demo_h2: "Thử ngay, không cần cài đặt.",
      demo_alt: "Ảnh mẫu xe máy trong repo, biển số được khoanh vùng để OCR",
      demo_cap: "Ảnh mẫu có sẵn trong repo — khung vàng là vùng biển hệ thống khoanh được trước khi OCR.",
      demo_h3: "Đọc biển ngay trong trình duyệt",
      demo_p: "Bản demo web tự tìm vùng biển trong ảnh bạn tải lên, tiền xử lý bản crop rồi đọc bằng <strong>Tesseract.js</strong> — mọi thứ chạy phía client. Pipeline Python đầy đủ (YOLOv8 + EasyOCR) chạy ở máy local với các lệnh bên dưới.",
      demo_mirror: "Bản mirror HF Space",
      cta_h2: "Có sẵn toàn bộ mã nguồn<br />trên GitHub.",
      cta_p: "Clone repo, huấn luyện lại trên dữ liệu của bạn, hoặc mở demo và thử ngay với ảnh của bạn.",
      cta_repo: "Xem repo GitHub",
      foot_p: "Hệ thống nhận diện biển số xe — YOLOv8 + EasyOCR.<br />Trang này và bản demo chạy trên hạ tầng free-tier; pipeline Python chạy local.",
      foot_app: "App nhận diện",
      foot_credit: "Thiết kế &amp; phát triển bởi <strong>Trần Huy Hoàng</strong>"
    },
    en: {
      title: "Plates — License Plate Recognition System | YOLOv8 + EasyOCR",
      meta_desc: "Plates: an ANPR system using YOLOv8 for plate detection and EasyOCR for character reading, with a demo that runs entirely in your browser.",
      skip: "Skip to main content",
      brand_aria: "Plates — home",
      nav_menu: "Menu",
      nav_features: "Features",
      nav_system: "System",
      nav_cta: "Open the plate reader app",
      eyebrow: "ANPR · LICENSE PLATE RECOGNITION",
      h1: "From a single frame<br />to a <em>plate number</em>,<br />in a blink.",
      lede: "Plates pairs <strong>YOLOv8</strong> to locate the plate and <strong>EasyOCR</strong> to read its characters — on a single image, a whole folder, or a live camera feed. No GPU server needed: the demo reads plates right in your browser.",
      cta_try: "Try the live demo",
      cta_how: "See how it works",
      stat1: "detector variants<br />YOLOv8 &amp; YOLOv8-OBB",
      stat2: "steps in the pipeline<br />detection → result",
      stat3: "ways to run it<br />local Python · browser",
      hud_gate: "CAM 01 · ENTRY GATE",
      scene_alt: "Illustrated camera frame with a boxed license plate",
      ocr_status: "READ COMPLETE",
      visual_note: "The plate shown is a fictional illustration.",
      night_h2: "Dark, rain, fast traffic —<br />the plate still has to read.",
      night_cap: "AI-generated illustration: an ANPR camera on a highway gantry on a rainy night.",
      pipe_h2: "Four steps from raw pixels<br />to a plate string.",
      pipe_p: "Every step lives in the repo's Python source — no black boxes, no paid services.",
      s1_h: "Detection <span>Detect</span>",
      s1_p: "A fine-tuned YOLOv8 scans the whole frame for the <code>license_plate</code> class and returns a bounding box around each plate. The OBB variant in <code>detect_v2.py</code> also catches plates tilted by the camera angle.",
      s2_h: "Crop &amp; preprocess <span>Crop · Preprocess</span>",
      s2_p: "The plate region is cropped to its ROI, converted to grayscale, equalized with <code>equalizeHist</code>, then upscaled 2× with <code>INTER_CUBIC</code> interpolation so the glyphs are cleaner before reading.",
      s3_h: "Character reading <span>OCR</span>",
      s3_p: "EasyOCR reads characters from an allowlist of <code>0–9 A–Z</code>, then reassembles them following the two-line layout of Vietnamese plates — the series and the serial number never get mixed up.",
      s4_h: "Result &amp; evaluation <span>Result · Evaluate</span>",
      s4_p: "The complete plate string is ready for barriers, parking systems or watchlists. The <code>evaluate_ocr.py</code> script scores OCR against a labeled crop dataset, so every iteration is measured and improved.",
      feat_kicker: "02 — Features",
      feat_h2: "Enough for a real ANPR system,",
      feat_p: "not just a showcase demo.",
      f1_h: "Two detectors side by side",
      f1_p: "Weights <code>yolov8n.pt</code> for straight-on plates and <code>yolov8n-obb.pt</code> for tilted ones — pick the model that matches your real camera angle.",
      f2_h: "OCR-first preprocessing",
      f2_p: "Contrast equalization and a 2× upscale run inside the pipeline, keeping OCR stable on blurry, dim or distant shots.",
      f3_h: "Fluent in Vietnamese plates",
      f3_p: "Two lines are reassembled in the Vietnamese layout, and the allowlist holds only letters and digits, so results carry little stray noise.",
      f4_h: "Live camera &amp; batch processing",
      f4_p: "<code>cam.py</code> reads plates from a webcam in real time; <code>detect.py</code> sweeps a whole folder of images and saves results in bulk.",
      f5_h: "A closed evaluation loop",
      f5_p: "A crop dataset with text labels scores OCR after every model or parameter change — improvements are always grounded in your own data.",
      f6_h: "A demo that runs in the browser",
      f6_p: "The web build locates the plate region (ROI), preprocesses it and reads it with Tesseract.js on the client — open the page and try it, no Python install required.",
      sys_kicker: "03 — Architecture",
      sys_h2: "One pipeline, two fronts.",
      sys_p: "Python owns accuracy on your local machine; the web build owns reach — anyone can open it. Both share one idea: locate first, read second.",
      fig1_alt: "Pipeline diagram: frame → YOLOv8 plate detection → preprocessing → EasyOCR",
      fig1_cap: "The processing pipeline: frame → plate box → preprocessing → character string.",
      fig2_alt: "Overall architecture diagram of the Plates system",
      fig2_cap: "Overall architecture: local Python, the web app and the Hugging Face mirror.",
      repo_detect: "detection + OCR",
      repo_obb: "OBB variant",
      repo_cam: "live camera",
      repo_eval: "OCR evaluation",
      repo_web: "browser demo",
      demo_h2: "Try it now — nothing to install.",
      demo_alt: "Sample motorcycle photo from the repo, its plate boxed for OCR",
      demo_cap: "A sample photo from the repo — the yellow box is the plate region the system locks onto before OCR.",
      demo_h3: "Read plates right in your browser",
      demo_p: "The web demo finds the plate region in your uploaded photo, preprocesses the crop and reads it with <strong>Tesseract.js</strong> — everything runs on the client. The full Python pipeline (YOLOv8 + EasyOCR) runs locally with the commands below.",
      demo_mirror: "HF Space mirror",
      cta_h2: "The full source is<br />on GitHub.",
      cta_p: "Clone the repo, retrain on your own data, or open the demo and try it with your own photos.",
      cta_repo: "View the GitHub repo",
      foot_p: "License plate recognition system — YOLOv8 + EasyOCR.<br />This page and the demo run on free-tier hosting; the Python pipeline runs locally.",
      foot_app: "Plate reader app",
      foot_credit: "Designed &amp; built by <strong>Trần Huy Hoàng</strong>"
    }
  };

  var LANG_KEY = "site-lang";
  var lang = "vi";
  try {
    var saved = localStorage.getItem(LANG_KEY);
    if (saved === "vi" || saved === "en") lang = saved;
  } catch (e) { /* storage unavailable */ }

  function applyLang(next) {
    lang = next;
    var dict = I18N[lang];
    document.documentElement.setAttribute("lang", lang);
    document.title = dict.title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", dict.meta_desc);
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      if (dict[key] === undefined) return;
      if (el.tagName === "IMG") el.setAttribute("alt", dict[key]);
      else el.setAttribute("aria-label", dict[key]);
    });
    var current = document.getElementById("lang-current");
    if (current) current.textContent = lang.toUpperCase();
    document.querySelectorAll(".lang-opt").forEach(function (opt) {
      var active = opt.getAttribute("data-lang") === lang;
      opt.classList.toggle("active", active);
      opt.setAttribute("aria-selected", active ? "true" : "false");
    });
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
  }

  /* Language switcher */
  var pill = document.getElementById("lang-pill");
  var menu = document.getElementById("lang-menu");
  var switcher = document.getElementById("lang-switch");
  function closeMenu() {
    if (!menu) return;
    menu.hidden = true;
    if (pill) pill.setAttribute("aria-expanded", "false");
  }
  function toggleMenu(force) {
    if (!menu || !pill) return;
    var open = typeof force === "boolean" ? force : menu.hidden;
    menu.hidden = !open;
    pill.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (pill && menu) {
    pill.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleMenu();
    });
    menu.addEventListener("click", function (e) {
      var opt = e.target.closest(".lang-opt");
      if (!opt) return;
      applyLang(opt.getAttribute("data-lang"));
      closeMenu();
      pill.focus();
    });
    document.addEventListener("click", function (e) {
      if (switcher && !switcher.contains(e.target)) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }
  applyLang(lang);

  /* ================= Mobile nav ================= */
  var toggle = document.querySelector(".nav-toggle");
  var navMenu = document.getElementById("nav-menu");
  if (toggle && navMenu) {
    toggle.addEventListener("click", function () {
      var open = navMenu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navMenu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        navMenu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Nav gains weight once the page scrolls */
  var navBar = document.querySelector(".site-nav");
  if (navBar) {
    var onScroll = function () {
      navBar.classList.toggle("scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= Reveals: GSAP + ScrollTrigger, IO fallback ================= */
  var revealNodes = document.querySelectorAll(".reveal");
  var useGsap = !reduceMotion && window.gsap && window.ScrollTrigger;
  if (useGsap) {
    document.documentElement.classList.add("gsap");
    gsap.registerPlugin(ScrollTrigger);

    /* hero entrance */
    gsap.fromTo(
      ".hero-copy .reveal",
      { opacity: 0, y: 34 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.12, delay: 0.1 }
    );
    gsap.fromTo(
      ".hero-visual",
      { opacity: 0, y: 44, scale: 0.985 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: "power3.out", delay: 0.35 }
    );

    /* scroll progress hairline */
    var progress = document.createElement("div");
    progress.className = "scroll-progress";
    document.body.appendChild(progress);
    gsap.fromTo(progress, { scaleX: 0 }, {
      scaleX: 1, ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 }
    });

    /* generic scroll reveals (custom-handled blocks excluded) */
    var customSel = ".section-head, .step, .feature, .figure";
    gsap.utils.toArray(".reveal").forEach(function (el) {
      if (el.closest(".hero-copy") || el.classList.contains("hero-visual")) return;
      if (el.matches(customSel)) return;
      gsap.fromTo(
        el,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.95,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        }
      );
    });

    /* section heads: kicker rule grows, headline un-clips upward */
    gsap.utils.toArray(".section-head").forEach(function (head) {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: head, start: "top 86%", once: true }
      });
      tl.fromTo(head, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" })
        .fromTo(
          head.querySelector("h2"),
          { clipPath: "inset(0 0 100% 0)", y: 30 },
          { clipPath: "inset(0 0 -12% 0)", y: 0, duration: 0.95, ease: "power3.out" },
          "-=0.35"
        )
        .fromTo(
          head.querySelectorAll("p"),
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
          "-=0.55"
        );
    });

    /* pipeline steps: rule draws in, number settles, rows drift from alternating sides */
    gsap.utils.toArray(".step").forEach(function (step, idx) {
      var st = { trigger: step, start: "top 88%", once: true };
      gsap.fromTo(step, { opacity: 0, x: idx % 2 ? 40 : -40 },
        { opacity: 1, x: 0, duration: 0.9, ease: "power3.out", scrollTrigger: st });
      gsap.fromTo(step, { "--draw": 0 },
        { "--draw": 1, duration: 1.1, ease: "power2.inOut", scrollTrigger: st });
      gsap.fromTo(step.querySelector(".step-num"),
        { opacity: 0.2, scale: 0.82, transformOrigin: "left top" },
        { opacity: 1, scale: 1, duration: 0.9, ease: "power3.out", scrollTrigger: st });
    });

    /* feature cards: batch flip-in + pointer tilt with glare */
    gsap.set(".feature", { opacity: 0 });
    ScrollTrigger.batch(".feature", {
      start: "top 92%",
      once: true,
      onEnter: function (batch) {
        gsap.fromTo(batch,
          { opacity: 0, y: 46, rotationX: -14, transformPerspective: 900 },
          { opacity: 1, y: 0, rotationX: 0, duration: 0.85, stagger: 0.09, ease: "power3.out" });
      }
    });
    if (window.matchMedia("(pointer: fine)").matches) {
      document.querySelectorAll(".feature").forEach(function (card) {
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          card.style.setProperty("--mx", px * 100 + "%");
          card.style.setProperty("--my", py * 100 + "%");
          gsap.to(card, { rotationY: (px - 0.5) * 7, rotationX: (0.5 - py) * 7, transformPerspective: 900, duration: 0.5, ease: "power2.out" });
        });
        card.addEventListener("pointerleave", function () {
          gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.7, ease: "power3.out" });
        });
      });
    }

    /* figures: clip wipe open + inner parallax drift */
    gsap.utils.toArray(".figure").forEach(function (fig) {
      gsap.fromTo(fig,
        { clipPath: "inset(14% 7% 14% 7% round 18px)", opacity: 0 },
        {
          clipPath: "inset(0% 0% 0% 0% round 18px)", opacity: 1, duration: 1.05, ease: "power3.out",
          scrollTrigger: { trigger: fig, start: "top 85%", once: true }
        });
      var img = fig.querySelector("img");
      if (img) {
        gsap.fromTo(img, { yPercent: -6, scale: 1.14 },
          {
            yPercent: 6, scale: 1.14, ease: "none",
            scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true }
          });
      }
    });

    /* repo strip cells stagger */
    var cells = document.querySelectorAll(".repo-strip > div");
    if (cells.length) {
      gsap.fromTo(cells, { opacity: 0, y: 18 },
        {
          opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: "power3.out",
          scrollTrigger: { trigger: ".repo-strip", start: "top 90%", once: true }
        });
    }

    /* demo: detection box breathes once in view; CLI lines type in staggered */
    var demoShot = document.querySelector(".demo-shot");
    if (demoShot) {
      ScrollTrigger.create({
        trigger: demoShot, start: "top 80%", once: true,
        onEnter: function () { demoShot.classList.add("pulse-on"); }
      });
    }
    var cliCode = document.querySelector(".cli code");
    if (cliCode) {
      var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
      cliCode.innerHTML = cliCode.textContent.split("\n")
        .map(function (l) { return '<span class="cli-line">' + esc(l) + "</span>"; }).join("");
      gsap.fromTo(".cli-line", { opacity: 0, x: -16 },
        {
          opacity: 1, x: 0, duration: 0.5, stagger: 0.16, ease: "power2.out",
          scrollTrigger: { trigger: ".cli", start: "top 88%", once: true }
        });
    }

    /* CTA headline un-clips */
    var ctaH2 = document.querySelector(".cta-band h2");
    if (ctaH2) {
      gsap.fromTo(ctaH2,
        { clipPath: "inset(0 0 100% 0)", y: 26 },
        {
          clipPath: "inset(0 0 -12% 0)", y: 0, duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: ".cta-band", start: "top 78%", once: true }
        });
    }

    /* night band: viewfinder brackets snap in, HUD letters settle */
    gsap.fromTo(".vf",
      { opacity: 0, scale: 1.6 },
      {
        opacity: 1, scale: 1, duration: 0.8, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: ".night-band", start: "top 70%", once: true }
      });
    gsap.fromTo(".night-hud",
      { opacity: 0, letterSpacing: "0.55em" },
      {
        opacity: 1, letterSpacing: "0.24em", duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: ".night-band", start: "top 62%", once: true }
      });

    /* night band parallax */
    var nightImg = document.getElementById("night-img");
    if (nightImg) {
      gsap.fromTo(
        nightImg,
        { yPercent: -10 },
        {
          yPercent: 10,
          ease: "none",
          scrollTrigger: { trigger: ".night-band", start: "top bottom", end: "bottom top", scrub: true }
        }
      );
    }
    gsap.to(".night-word", {
      xPercent: -6,
      ease: "none",
      scrollTrigger: { trigger: ".night-band", start: "top bottom", end: "bottom top", scrub: true }
    });

    /* hero camera frame: gentle pointer parallax */
    var frame = document.querySelector(".cam-frame");
    var hero = document.querySelector(".hero");
    if (frame && hero && window.matchMedia("(pointer: fine)").matches) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(frame, { rotationY: dx * 5, rotationX: -dy * 4, transformPerspective: 1100, duration: 0.7, ease: "power2.out" });
      });
      hero.addEventListener("pointerleave", function () {
        gsap.to(frame, { rotationY: 0, rotationX: 0, duration: 0.8, ease: "power2.out" });
      });
    }
  } else if (!("IntersectionObserver" in window) || reduceMotion) {
    revealNodes.forEach(function (n) { n.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    revealNodes.forEach(function (n) { io.observe(n); });
  }

  /* ================= HUD telemetry ================= */
  var hudTime = document.getElementById("hud-time");
  if (hudTime) {
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var tickClock = function () {
      var d = new Date();
      hudTime.textContent =
        d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
        " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    };
    tickClock();
    setInterval(tickClock, 1000);
  }
  var frameNo = document.getElementById("frame-no");
  if (frameNo && !reduceMotion) {
    var f = 0;
    setInterval(function () {
      if (document.hidden) return;
      f += 1 + Math.floor(Math.random() * 3);
      var s = String(f);
      while (s.length < 6) s = "0" + s;
      frameNo.textContent = "FRAME " + s;
    }, 90);
  }

  /* ================= OCR readout typewriter ================= */
  var ocr = document.querySelector("[data-typewriter]");
  if (ocr && !reduceMotion) {
    var full = ocr.getAttribute("data-typewriter");
    var i = 0;
    var deleting = false;
    function tick() {
      if (!deleting) {
        i++;
        ocr.textContent = full.slice(0, i);
        if (i === full.length) {
          deleting = true;
          return setTimeout(tick, 2600);
        }
        return setTimeout(tick, 95);
      }
      i--;
      ocr.textContent = full.slice(0, i);
      if (i === 0) {
        deleting = false;
        return setTimeout(tick, 500);
      }
      setTimeout(tick, 40);
    }
    ocr.textContent = "";
    setTimeout(tick, 700);
  }
})();
