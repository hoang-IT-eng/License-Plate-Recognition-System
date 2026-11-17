(function () {
  "use strict";

  /* ==========================================================================
     1. BILINGUAL EN / VI DICTIONARY & SWITCHER
     ========================================================================== */
  var I18N = {
    en: {
      skip_main: "Skip to optical telemetry",
      nav_pipeline: "01 / Pipeline",
      nav_workbench: "02 / Live Workbench",
      nav_benchmarks: "03 / Benchmarks",
      nav_studio: "Studio /app ↗",
      nav_cta: "Run Live OCR",
      hero_kicker: "YOLOv8-OBB · HOMOGRAPHY DEWARP · ZERO-GPU BROWSER ROI",
      hero_h1: "Precision optical lock for <em>Vietnamese</em> plates.",
      hero_lead:
        "Full-frame OCR drowns in grilles, bumper chrome, and sodium street glare. PLATES isolates oriented 4-vertex plate geometry first—via YOLOv8n-OBB on GPU gates or an integral-Sobel cascade in the browser—dewarps perspective skew, and decodes 1-line and 2-line Vietnamese syntax.",
      hero_cta_workbench: "Test Interactive ROI Workbench",
      hero_cta_studio: "Launch /app Studio",
      hero_cta_repo: "GitHub Source ↗",
      m1_label: "OBB Localization mAP@50",
      m2_label: "Homography Warp Rectifier",
      m3_label: "YOLOv8n-OBB T4 Gate Inference",
      m4_label: "Server GPU Needed on Web F1",
      pipe_kicker: "01 / FOUR-STAGE OPTICAL DISSECTION",
      pipe_title: "Isolate geometry first. Read glyphs second.",
      pipe_sub:
        "Scroll or select any stage below to inspect how a noisy street capture transforms into a normalized, syntax-verified Vietnamese registration record.",
      st1_title: "Raw Street Frame Acquisition",
      st1_desc:
        "Captures tilted vehicle approaches under mixed sodium streetlamps, headlight bloom, radiator grille texture, and asphalt reflections where naive full-image OCR hallucinates noise.",
      st2_title: "Oriented Plate Localization",
      st2_desc:
        "Predicts rotated 4-vertex polygons (classes BSD 1-line car & BSV 2-line moto) on GPU, or executes integral-image Sobel + bright-blob spatial priors in zero-GPU browsers.",
      st3_title: "Perspective Dewarp & Contrast Normalization",
      st3_desc:
        "Applies 4-point homography (cv2.warpPerspective) to flatten oblique angles, trims border bolts, and stretches luminance [minG..maxG] → [0..255] at 2.5× upscale.",
      st4_title: "Two-Line Y-Cluster & Syntax Disambiguation",
      st4_desc:
        "Clusters top/bottom glyph baselines for 2-line motorcycle plates and resolves optical confusions (O→0, I→1, Z→2, S→5, B→8) by Vietnamese province-series-serial grammar.",
      wb_kicker: "02 / LIVE CLIENT-SIDE ROI → OCR WORKBENCH",
      wb_title: "Drag the optical ROI. Run real OCR in your browser.",
      wb_sub:
        "Pick a Vietnamese car or motorbike capture below—or drop your own photo. Drag inside the emerald reticle to reposition, drag any corner handle to resize, or click-drag to draw a custom ROI before running Tesseract.js on the normalized crop.",
      wb_open_full: "Open Fullscreen /app Studio ↗",
      wb_samples_lbl: "CALIBRATED VIETNAMESE TEST FRAMES",
      wb_upload_btn: "+ Upload Vehicle / Plate Image",
      wb_autoroi_btn: "Auto-Detect ROI",
      wb_run_btn: "Run ROI + OCR",
      wb_telemetry_lbl: "OPTICAL DECODER TELEMETRY",
      wb_decoded_lbl: "CANONICAL VN REGISTRATION",
      wb_crop_note:
        "2.5× contrast-stretched luminance crop isolated from background clutter prior to glyph recognition.",
      wb_char_lbl: "PER-GLYPH CONFIDENCE DISTRIBUTION",
      bench_kicker: "03 / BENCHMARK & EDGE DEPLOYMENT MATRIX",
      bench_title: "Engineered for CUDA toll gates and zero-GPU static cloud.",
      bench_sub:
        "One repository, two execution runtimes: full YOLOv8n-OBB + PaddleOCR/EasyOCR for high-throughput RTSP camera lanes, and a zero-cost client ROI-to-OCR cascade for Azure App Service F1 and Hugging Face Static Spaces.",
      th_pipeline: "Execution Pipeline",
      th_detector: "Plate Detector",
      th_ocr: "OCR & Rectifier",
      th_latency: "Latency / Frame",
      th_target: "Target Host",
      dep1_title: "YOLOv8n-OBB Gate Pipeline",
      dep1_desc:
        "Trained on Vietnamese 1-line (BSD) and 2-line (BSV) oriented annotations (imgsz=640, rotation ±15°). Eliminates perspective shear before OCR via 4-point homography.",
      dep2_title: "Zero-Dependency Node Shell",
      dep2_desc:
        "Served by a lightweight core http server (web/server.js) with zero heavy Python wheels on F1 shared CPU—pushing ROI extraction and WASM OCR cleanly to the visitor's browser.",
      dep3_title: "Identical Shared ROI Kernel",
      dep3_desc:
        "Both web/app/ and hf-space/ execute the exact same plate-roi.js + ocr.js modules so static cloud previews match local studio behavior byte-for-byte."
    },
    vi: {
      skip_main: "Chuyển tới bảng điều khiển quang học",
      nav_pipeline: "01 / Quy trình",
      nav_workbench: "02 / Bàn thử OCR",
      nav_benchmarks: "03 / Hiệu năng",
      nav_studio: "Studio /app ↗",
      nav_cta: "Chạy OCR trực tiếp",
      hero_kicker: "YOLOv8-OBB · KHỬ NGHIÊNG HOMOGRAPHY · ROI TRÌNH DUYỆT 0-GPU",
      hero_h1: "Khóa quang học chuẩn xác cho <em>biển số Việt</em>.",
      hero_lead:
        "OCR toàn khung hình dễ nhiễu bởi lưới tản nhiệt, viền crôm và ánh đèn đường. PLATES cô lập đa giác 4 đỉnh của biển số trước—bằng YOLOv8n-OBB trên trạm GPU hoặc chuỗi tích phân Sobel ngay trên trình duyệt—phẳng hóa phối cảnh và giải mã cú pháp biển 1 dòng & 2 dòng.",
      hero_cta_workbench: "Thử Bàn Cắt ROI + OCR",
      hero_cta_studio: "Mở Studio /app",
      hero_cta_repo: "Mã nguồn GitHub ↗",
      m1_label: "Độ chính xác định vị OBB mAP@50",
      m2_label: "Phép chiếu phẳng Homography",
      m3_label: "Độ trễ YOLOv8n-OBB trên T4",
      m4_label: "GPU máy chủ cần trên Web F1",
      pipe_kicker: "01 / GIẢI PHẪU QUANG HỌC 4 GIAI ĐOẠN",
      pipe_title: "Cô lập hình học trước. Đọc ký tự sau.",
      pipe_sub:
        "Cuộn trang hoặc chọn từng bước bên dưới để quan sát khung hình giao thông thực tế được chuẩn hóa thành biển số chuẩn định dạng Việt Nam.",
      st1_title: "Thu nhận khung hình gốc ngoài phố",
      st1_desc:
        "Ghi nhận xe tiếp cận ở góc nghiêng dưới ánh đèn natri vàng, chói đèn pha và họa tiết lưới tản nhiệt khiến OCR toàn ảnh thông thường đọc sai.",
      st2_title: "Định vị biển số xoay (Oriented ROI)",
      st2_desc:
        "Dự đoán đa giác 4 đỉnh xoay (lớp BSD biển dài 1 dòng & BSV biển vuông 2 dòng) trên GPU, hoặc chạy tích phân Sobel + vùng sáng trên trình duyệt.",
      st3_title: "Phẳng hóa phối cảnh & Cân bằng tương phản",
      st3_desc:
        "Áp dụng biến đổi cv2.warpPerspective 4 điểm để khử góc nghiêng, cắt bỏ đinh tán viền và kéo giãn dải sáng [minG..maxG] → [0..255] ở tỷ lệ 2.5×.",
      st4_title: "Phân cụm 2 dòng & Chuẩn hóa cú pháp VN",
      st4_desc:
        "Tách dòng trên/dưới theo trục Y cho biển xe máy 2 dòng và khử nhầm lẫn quang học (O→0, I→1, Z→2, S→5, B→8) theo quy chuẩn mã tỉnh – seri.",
      wb_kicker: "02 / BÀN THỬ NGHIỆM ROI → OCR TRÊN TRÌNH DUYỆT",
      wb_title: "Kéo khung ROI quang học. Chạy OCR thật ngay tại chỗ.",
      wb_sub:
        "Chọn mẫu xe ô tô / xe máy Việt Nam bên dưới hoặc tải ảnh của bạn. Kéo bên trong khung xanh ngọc để di chuyển, kéo góc để đổi kích thước, hoặc vẽ vùng ROI mới trước khi chạy Tesseract.js.",
      wb_open_full: "Mở toàn màn hình /app Studio ↗",
      wb_samples_lbl: "ẢNH MẪU BIỂN SỐ VIỆT NAM CHUẨN HÓA",
      wb_upload_btn: "+ Tải ảnh xe / biển số",
      wb_autoroi_btn: "Tự động dò ROI",
      wb_run_btn: "Chạy ROI + OCR",
      wb_telemetry_lbl: "THÔNG SỐ GIẢI MÃ QUANG HỌC",
      wb_decoded_lbl: "BIỂN SỐ ĐỊNH DẠNG CHUẨN",
      wb_crop_note:
        "Ảnh cắt vùng ROI phóng đại 2.5× và kéo tương phản giúp loại bỏ hoàn toàn nhiễu nền trước khi nhận dạng.",
      wb_char_lbl: "ĐỘ TIN CẬY TỪNG KÝ TỰ",
      bench_kicker: "03 / MA TRẬN HIỆU NĂNG & TRIỂN KHAI BIÊN",
      bench_title: "Thiết kế cho trạm thu phí CUDA lẫn đám mây tĩnh miễn phí.",
      bench_sub:
        "Một kho mã nguồn, hai môi trường thực thi: YOLOv8n-OBB + PaddleOCR/EasyOCR tốc độ cao cho luồng RTSP, và bộ dò ROI + OCR phía trình duyệt cho Azure F1 và Hugging Face Static Space.",
      th_pipeline: "Cấu hình thực thi",
      th_detector: "Bộ dò biển số",
      th_ocr: "Bộ đọc & Phẳng hóa",
      th_latency: "Độ trễ / Khung",
      th_target: "Môi trường đích",
      dep1_title: "Trạm GPU YOLOv8n-OBB",
      dep1_desc:
        "Huấn luyện trên nhãn xoay biển dài 1 dòng (BSD) và biển vuông 2 dòng (BSV). Loại bỏ biến dạng góc nhìn trước khi OCR bằng ma trận Homography.",
      dep2_title: "Máy chủ Node siêu nhẹ Azure F1",
      dep2_desc:
        "Phục vụ bởi máy chủ http thuần (web/server.js) không phụ thuộc gói nặng, chuyển toàn bộ bước cắt ROI và WASM OCR sang trình duyệt người dùng.",
      dep3_title: "Nhân ROI dùng chung đồng nhất",
      dep3_desc:
        "Cả web/app/ và hf-space/ cùng chạy chung mô-đun plate-roi.js + ocr.js, đảm bảo kết quả đồng nhất tuyệt đối giữa đám mây và máy trạm."
    }
  };

  var currentLang = "en";
  try {
    var saved = localStorage.getItem("plates-lang");
    if (saved === "vi" || saved === "en") currentLang = saved;
  } catch (e) { /* ignore */ }

  function applyLang(lang) {
    currentLang = lang === "vi" ? "vi" : "en";
    document.documentElement.lang = currentLang;
    try {
      localStorage.setItem("plates-lang", currentLang);
    } catch (e) { /* ignore */ }

    var dict = I18N[currentLang];
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute("data-i18n");
      if (dict[k]) nodes[i].textContent = dict[k];
    }
    var htmlNodes = document.querySelectorAll("[data-i18n-html]");
    for (var j = 0; j < htmlNodes.length; j++) {
      var hk = htmlNodes[j].getAttribute("data-i18n-html");
      if (dict[hk]) htmlNodes[j].innerHTML = dict[hk];
    }
    var lbl = document.getElementById("langLabel");
    if (lbl) {
      lbl.textContent = currentLang === "en" ? "EN · VI" : "VI · EN";
    }
  }

  function initNavAndLang() {
    applyLang(currentLang);
    var langBtn = document.getElementById("langBtn");
    if (langBtn) {
      langBtn.addEventListener("click", function () {
        applyLang(currentLang === "en" ? "vi" : "en");
      });
    }
    var navToggle = document.getElementById("navToggle");
    var navLinks = document.getElementById("navLinks");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", function () {
        var open = navLinks.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", String(open));
      });
    }
  }

  /* ==========================================================================
     2. THREE.JS 3D ANPR CAMERA FRUSTUM & SPATIAL POINT-CLOUD VEHICLE SCANNER
     ========================================================================== */
  function initAnprThreeScene() {
    var canvas = document.getElementById("anprCanvas");
    var fallback = document.getElementById("anprFallback");
    var stage = document.getElementById("scannerStage");
    if (!canvas || !stage) return;

    var reducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!window.THREE || reducedMotion) {
      canvas.style.display = "none";
      if (fallback) fallback.hidden = false;
      return;
    }

    try {
      var THREE = window.THREE;
      var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.1, 100);
      camera.position.set(0.35, 1.35, 6.4);
      camera.lookAt(0.15, -0.05, 0);

      var root = new THREE.Group();
      scene.add(root);

      /* Subtle ground optical telemetry grid */
      var gridHelper = new THREE.GridHelper(11, 22, 0x1e293b, 0x131a24);
      gridHelper.position.y = -1.35;
      root.add(gridHelper);

      /* --- A. 3D ANPR Optical Camera Unit (Upper-Left) --- */
      var camRig = new THREE.Group();
      camRig.position.set(-2.35, 1.15, 0.75);
      root.add(camRig);

      var housingGeo = new THREE.BoxGeometry(0.78, 0.44, 0.46);
      var housingMat = new THREE.MeshStandardMaterial({
        color: 0x161c24,
        metalness: 0.75,
        roughness: 0.32
      });
      var housingMesh = new THREE.Mesh(housingGeo, housingMat);
      camRig.add(housingMesh);

      var housingEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(housingGeo),
        new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.75 })
      );
      camRig.add(housingEdges);

      var barrelGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.28, 24);
      barrelGeo.rotateZ(Math.PI / 2);
      var barrelMesh = new THREE.Mesh(
        barrelGeo,
        new THREE.MeshStandardMaterial({ color: 0x0b0e13, metalness: 0.85, roughness: 0.2 })
      );
      barrelMesh.position.set(0.48, 0, 0);
      camRig.add(barrelMesh);

      var lensRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.018, 12, 32),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      lensRing.rotation.y = Math.PI / 2;
      lensRing.position.set(0.62, 0, 0);
      camRig.add(lensRing);

      camRig.rotation.z = -0.32;
      camRig.rotation.y = -0.18;

      /* --- B. Spatial Point-Cloud Vehicle Silhouette (Right-Center) --- */
      var vehicleGroup = new THREE.Group();
      vehicleGroup.position.set(1.05, -0.38, 0.0);
      vehicleGroup.rotation.y = -0.46;
      root.add(vehicleGroup);

      var pts = [];
      var cols = [];
      var cEmerald = new THREE.Color(0x10b981);
      var cSlate = new THREE.Color(0x64748b);
      var cIvory = new THREE.Color(0xeef1f4);
      var cAmber = new THREE.Color(0xf59e0b);

      function pushPt(x, y, z, col) {
        pts.push(x, y, z);
        cols.push(col.r, col.g, col.b);
      }

      /* Lower chassis & front bumper volume */
      for (var ix = -1.05; ix <= 1.05; ix += 0.085) {
        for (var iz = -1.55; iz <= 1.55; iz += 0.11) {
          /* Surface shell of sedan body */
          var hoodY = 0.28;
          if (iz > -0.6 && iz < 0.75) {
            /* Cabin roof arch */
            var roofFactor = Math.cos(((iz - 0.08) / 0.72) * (Math.PI * 0.5));
            hoodY = 0.28 + Math.max(0, roofFactor) * 0.54 * (1 - Math.abs(ix) * 0.18);
          } else if (iz <= -0.6) {
            /* Sloping front hood toward bumper */
            hoodY = 0.28 - ((-0.6 - iz) / 0.95) * 0.16;
          }
          var edgeBias = Math.abs(ix) > 0.92 || Math.abs(iz) > 1.42;
          pushPt(ix, hoodY, iz, edgeBias ? cEmerald : cSlate);
          if (edgeBias) {
            for (var sy = -0.48; sy < hoodY; sy += 0.13) {
              pushPt(ix, sy, iz, iz < -1.35 ? cIvory : cSlate);
            }
          }
        }
      }

      /* Front headlights (sodium amber accents) & radiator grille matrix */
      for (var gx = -0.62; gx <= 0.62; gx += 0.07) {
        for (var gy = -0.34; gy <= -0.05; gy += 0.065) {
          pushPt(gx, gy, -1.56, cSlate);
        }
      }
      [-0.78, 0.78].forEach(function (hx) {
        for (var dx = -0.14; dx <= 0.14; dx += 0.045) {
          for (var dy = -0.08; dy <= 0.05; dy += 0.045) {
            pushPt(hx + dx, dy, -1.55, cAmber);
          }
        }
      });

      var pcGeo = new THREE.BufferGeometry();
      pcGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      pcGeo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      var pcMat = new THREE.PointsMaterial({
        size: 0.036,
        vertexColors: true,
        transparent: true,
        opacity: 0.88
      });
      var pointCloud = new THREE.Points(pcGeo, pcMat);
      vehicleGroup.add(pointCloud);

      /* --- C. High-Contrast 3D License Plate Plane + YOLOv8-OBB Corner Locks --- */
      var plateTexCanvas = document.createElement("canvas");
      plateTexCanvas.width = 512;
      plateTexCanvas.height = 144;
      var pctx = plateTexCanvas.getContext("2d");
      pctx.fillStyle = "#f4f6f8";
      pctx.fillRect(0, 0, 512, 144);
      pctx.strokeStyle = "#090b0e";
      pctx.lineWidth = 10;
      pctx.strokeRect(8, 8, 496, 128);
      pctx.fillStyle = "#090b0e";
      pctx.font = "700 84px JetBrains Mono, monospace";
      pctx.textAlign = "center";
      pctx.textBaseline = "middle";
      pctx.fillText("51G-888.99", 256, 76);

      var plateTex = new THREE.CanvasTexture(plateTexCanvas);
      var plateMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.24),
        new THREE.MeshBasicMaterial({ map: plateTex, side: THREE.DoubleSide })
      );
      plateMesh.position.set(0, -0.26, -1.59);
      plateMesh.rotation.y = Math.PI;
      vehicleGroup.add(plateMesh);

      /* Oriented Bounding Box (YOLOv8-OBB) glowing emerald bracket around plate */
      var obbGroup = new THREE.Group();
      obbGroup.position.copy(plateMesh.position);
      obbGroup.position.z -= 0.025;
      vehicleGroup.add(obbGroup);

      var obbW = 0.96;
      var obbH = 0.33;
      var cLen = 0.14;
      var bracketVerts = new Float32Array([
        -obbW / 2, obbH / 2 - cLen, 0, -obbW / 2, obbH / 2, 0,
        -obbW / 2, obbH / 2, 0, -obbW / 2 + cLen, obbH / 2, 0,
        obbW / 2 - cLen, obbH / 2, 0, obbW / 2, obbH / 2, 0,
        obbW / 2, obbH / 2, 0, obbW / 2, obbH / 2 - cLen, 0,
        obbW / 2, -obbH / 2 + cLen, 0, obbW / 2, -obbH / 2, 0,
        obbW / 2, -obbH / 2, 0, obbW / 2 - cLen, -obbH / 2, 0,
        -obbW / 2 + cLen, -obbH / 2, 0, -obbW / 2, -obbH / 2, 0,
        -obbW / 2, -obbH / 2, 0, -obbW / 2, -obbH / 2 + cLen, 0
      ]);
      var bracketGeo = new THREE.BufferGeometry();
      bracketGeo.setAttribute("position", new THREE.BufferAttribute(bracketVerts, 3));
      var bracketLines = new THREE.LineSegments(
        bracketGeo,
        new THREE.LineBasicMaterial({ color: 0x10b981 })
      );
      obbGroup.add(bracketLines);

      /* --- D. Volumetric Detection Frustum Rays (Lens -> Vehicle Bumper Plane) --- */
      var originPt = new THREE.Vector3(-1.82, 0.98, 0.65);
      var fCorners = [
        new THREE.Vector3(-0.05, 0.55, -0.95),
        new THREE.Vector3(1.95, 0.55, -0.35),
        new THREE.Vector3(1.95, -1.05, -0.35),
        new THREE.Vector3(-0.05, -1.05, -0.95)
      ];
      var frustumVerts = [];
      for (var fi = 0; fi < 4; fi++) {
        var fc = fCorners[fi];
        var fn = fCorners[(fi + 1) % 4];
        frustumVerts.push(originPt.x, originPt.y, originPt.z, fc.x, fc.y, fc.z);
        frustumVerts.push(fc.x, fc.y, fc.z, fn.x, fn.y, fn.z);
      }
      var frustumGeo = new THREE.BufferGeometry();
      frustumGeo.setAttribute("position", new THREE.Float32BufferAttribute(frustumVerts, 3));
      var frustumLines = new THREE.LineSegments(
        frustumGeo,
        new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.42 })
      );
      root.add(frustumLines);

      /* --- E. Laser Scan Line Plane sweeping across vehicle & plate --- */
      var laserGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.15, 0, -1.05),
        new THREE.Vector3(2.05, 0, -0.32)
      ]);
      var laserLine = new THREE.Line(
        laserGeo,
        new THREE.LineBasicMaterial({ color: 0xf59e0b })
      );
      root.add(laserLine);

      /* Lighting */
      scene.add(new THREE.AmbientLight(0xdbeafe, 0.85));
      var dirLight = new THREE.DirectionalLight(0x10b981, 1.6);
      dirLight.position.set(-3, 4, 3);
      scene.add(dirLight);
      var rimLight = new THREE.DirectionalLight(0xf59e0b, 1.1);
      rimLight.position.set(3, 2, 4);
      scene.add(rimLight);

      function resize() {
        var w = stage.clientWidth || 560;
        var h = stage.clientHeight || 380;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
      resize();
      window.addEventListener("resize", resize);

      var pointerX = 0;
      var pointerY = 0;
      var scrollNorm = 0;

      stage.addEventListener("pointermove", function (e) {
        var r = stage.getBoundingClientRect();
        pointerX = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
        pointerY = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
      });

      window.addEventListener(
        "scroll",
        function () {
          scrollNorm = Math.min(1, Math.max(0, window.scrollY / 700));
        },
        { passive: true }
      );

      var hudAz = document.getElementById("hudAzimuth");
      var hudZ = document.getElementById("hudScanZ");
      var hudCf = document.getElementById("hudConf");
      var clock = new THREE.Clock();

      function animate() {
        requestAnimationFrame(animate);
        var t = clock.getElapsedTime();

        var targetRotY = pointerX * 0.28 + scrollNorm * 0.22;
        var targetRotX = pointerY * 0.12;
        root.rotation.y += (targetRotY - root.rotation.y) * 0.06;
        root.rotation.x += (targetRotX - root.rotation.x) * 0.06;

        /* Sweep laser vertically across bumper & plate */
        var sweepY = -0.58 + (Math.sin(t * 2.1) * 0.5 + 0.5) * 0.52;
        laserLine.position.y = sweepY;

        /* Subtle pulse on OBB lock bracket when laser crosses plate height */
        var distToPlate = Math.abs(sweepY - -0.64);
        var lockScale = 1 + Math.max(0, 0.12 - distToPlate) * 0.45;
        obbGroup.scale.set(lockScale, lockScale, 1);

        if (hudAz && ((t * 10) | 0) % 3 === 0) {
          var deg = (14.2 + root.rotation.y * 28).toFixed(1);
          hudAz.textContent = (deg >= 0 ? "+" : "") + deg + "°";
          if (hudZ) hudZ.textContent = (0.62 + sweepY * 0.35).toFixed(2) + " m";
          if (hudCf) hudCf.textContent = (0.978 + Math.sin(t * 1.7) * 0.008).toFixed(3);
        }

        renderer.render(scene, camera);
      }
      animate();
    } catch (err) {
      canvas.style.display = "none";
      if (fallback) fallback.hidden = false;
    }
  }

  /* ==========================================================================
     3. GSAP + SCROLLTRIGGER PINNED 4-STAGE PIPELINE DISSECTION
     ========================================================================== */
  function initPipelineDissection() {
    var pCanvas = document.getElementById("pipelineCanvas");
    var cards = document.querySelectorAll(".stage-card");
    var codeEl = document.getElementById("pipelineCode");
    var stageTag = document.getElementById("dissectStageTag");
    var metricTag = document.getElementById("dissectMetricTag");
    var pctEl = document.getElementById("pipeProgressPct");
    if (!pCanvas || !cards.length) return;

    var ctx = pCanvas.getContext("2d");
    var activeStage = 0;
    var motoImg = new Image();
    motoImg.src = "./assets/sample-moto-29b1.jpg";

    var STAGE_META = [
      {
        tag: "STAGE 01 // RAW SENSOR FRAME",
        metric: "SNR 18.4 dB · TILT -11.5°",
        code:
          '# Stage 01 — Raw Street Capture (1920x1080 BGR)\nframe = cv2.imread("sample-moto-29b1.jpg")\n# Problem: tail-lamp bloom + wet asphalt reflections + bumper clutter'
      },
      {
        tag: "STAGE 02 // YOLOv8n-OBB 4-VERTEX LOCALIZATION",
        metric: "CLASS: BSV (2-LINE) · CONF 0.982",
        code:
          '# Stage 02 — Oriented Bounding Box (YOLOv8-OBB / Integral Sobel)\nres = obb_model.predict(frame, conf=0.35)[0]\npoly4 = res.obb.xyxyxyxy[0].cpu().numpy()  # 4 rotated corners'
      },
      {
        tag: "STAGE 03 // HOMOGRAPHY DEWARP & 2.5x CONTRAST",
        metric: "WARP: 260×200 PX · LUMA [0..255]",
        code:
          "# Stage 03 — Perspective Rectification & Contrast Stretch\nM = cv2.getPerspectiveTransform(order_points(poly4), dst_rect)\ncrop = contrast_stretch(cv2.warpPerspective(frame, M, (260, 200)))"
      },
      {
        tag: "STAGE 04 // 2-LINE Y-CLUSTER & VN SYNTAX OCR",
        metric: "OUTPUT: 29B1-682.45 · 14.2 MS",
        code:
          '# Stage 04 — Y-Center Line Clustering & Character Disambiguation\nrows = cluster_two_lines(ocr_boxes, y_thresh=0.48)\nplate = format_vn_plate(rows)  # O->0, B->8 => "29B1-682.45"'
      }
    ];

    function renderStage(stageIdx) {
      var w = pCanvas.width;
      var h = pCanvas.height;
      ctx.fillStyle = "#06080a";
      ctx.fillRect(0, 0, w, h);

      var hasImg = motoImg.complete && motoImg.naturalWidth > 0;
      if (hasImg && stageIdx < 2) {
        var scale = Math.min(w / motoImg.naturalWidth, h / motoImg.naturalHeight);
        var dw = motoImg.naturalWidth * scale;
        var dh = motoImg.naturalHeight * scale;
        var dx = (w - dw) * 0.5;
        var dy = (h - dh) * 0.5;
        ctx.drawImage(motoImg, dx, dy, dw, dh);

        if (stageIdx === 0) {
          /* Highlight clutter / glare zones */
          ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
          ctx.setLineDash([6, 4]);
          ctx.lineWidth = 1.5;
          ctx.strokeRect(dx + dw * 0.1, dy + dh * 0.14, dw * 0.8, dh * 0.75);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(9, 11, 14, 0.85)";
          ctx.fillRect(22, 22, 315, 32);
          ctx.fillStyle = "#f59e0b";
          ctx.font = "600 13px JetBrains Mono, monospace";
          ctx.fillText("FULL-FRAME NOISE: 93.6% NON-PLATE PIXELS", 32, 43);
        } else if (stageIdx === 1) {
          /* Darken exterior and lock emerald OBB polygon onto rear plate */
          ctx.fillStyle = "rgba(6, 8, 10, 0.64)";
          ctx.fillRect(0, 0, w, h);

          var rx = w * 0.34;
          var ry = h * 0.45;
          var rw = w * 0.32;
          var rh = h * 0.31;
          ctx.save();
          ctx.beginPath();
          ctx.rect(rx, ry, rw, rh);
          ctx.clip();
          ctx.drawImage(motoImg, dx, dy, dw, dh);
          ctx.restore();

          /* Rotated OBB quad + corner reticles */
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 3;
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.fillStyle = "rgba(9, 11, 14, 0.9)";
          ctx.fillRect(rx, ry - 30, 215, 26);
          ctx.fillStyle = "#10b981";
          ctx.font = "700 13px JetBrains Mono, monospace";
          ctx.fillText("YOLOv8-OBB · BSV 0.982", rx + 8, ry - 12);
        }
      } else {
        /* Stages 2 & 3 (or before image finishes loading): Rectified High-Contrast Crop View */
        ctx.strokeStyle = "#161d27";
        ctx.lineWidth = 1;
        for (var gx = 0; gx < w; gx += 38) {
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
        }
        for (var gy = 0; gy < h; gy += 38) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }

        var pw = 390;
        var ph = 265;
        var px = (w - pw) * 0.5;
        var py = (h - ph) * 0.5 - 8;

        ctx.fillStyle = "#eef1f4";
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = "#1f2937";
        ctx.lineWidth = 8;
        ctx.strokeRect(px + 8, py + 8, pw - 16, ph - 16);

        ctx.fillStyle = "#090b0e";
        ctx.font = "700 84px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("29-B1", px + pw * 0.5, py + ph * 0.31);
        ctx.fillText("682.45", px + pw * 0.5, py + ph * 0.71);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";

        if (stageIdx === 2) {
          /* Homography corner vectors + luminance stretch bar */
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(px - 6, py - 6, pw + 12, ph + 12);
          ctx.fillStyle = "rgba(9, 11, 14, 0.92)";
          ctx.fillRect(24, h - 52, w - 48, 34);
          ctx.fillStyle = "#10b981";
          ctx.font = "600 13px JetBrains Mono, monospace";
          ctx.fillText("HOMOGRAPHY RECTIFIED · 2.5x UPSCALE · CONTRAST [28..239] -> [0..255]", 36, h - 30);
        } else {
          /* Stage 04: Y-cluster row split + per-glyph boxes */
          ctx.strokeStyle = "#f59e0b";
          ctx.setLineDash([7, 5]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px - 24, py + ph * 0.51);
          ctx.lineTo(px + pw + 24, py + ph * 0.51);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 54, py + 38, pw - 108, 76);
          ctx.strokeRect(px + 34, py + 146, pw - 68, 80);

          ctx.fillStyle = "rgba(9, 11, 14, 0.94)";
          ctx.fillRect(24, h - 54, w - 48, 36);
          ctx.fillStyle = "#10b981";
          ctx.font = "700 14px JetBrains Mono, monospace";
          ctx.fillText("ROW_1: 29B1  +  ROW_2: 68245  =>  CANONICAL: 29B1-682.45 (CONF 97.4%)", 36, h - 31);
        }
      }
    }

    function setActiveStage(idx) {
      idx = Math.max(0, Math.min(3, idx));
      activeStage = idx;
      for (var i = 0; i < cards.length; i++) {
        var on = i === idx;
        cards[i].classList.toggle("is-active", on);
        cards[i].setAttribute("aria-selected", String(on));
      }
      var m = STAGE_META[idx];
      if (stageTag) stageTag.textContent = m.tag;
      if (metricTag) metricTag.textContent = m.metric;
      if (codeEl) codeEl.textContent = m.code;
      if (pctEl) pctEl.textContent = "0" + (idx + 1) + " / 04";
      renderStage(idx);
    }

    for (var c = 0; c < cards.length; c++) {
      (function (idx) {
        cards[idx].addEventListener("click", function () {
          setActiveStage(idx);
        });
      })(c);
    }

    motoImg.onload = function () {
      renderStage(activeStage);
    };
    setActiveStage(0);

    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.ScrollTrigger.create({
        trigger: "#pipeline",
        start: "top 35%",
        end: "bottom 55%",
        onUpdate: function (self) {
          var s = Math.min(3, Math.floor(self.progress * 4));
          if (s !== activeStage) setActiveStage(s);
        }
      });
    }
  }

  /* ==========================================================================
     4. INLINE INTERACTIVE DRAGGABLE ROI -> OCR WORKBENCH
     ========================================================================== */
  function initInteractiveWorkbench() {
    var wbCanvas = document.getElementById("wbCanvas");
    if (!wbCanvas || !window.PlatesRoi || !window.PlatesOcr) return;

    var ctx = wbCanvas.getContext("2d");
    var sampleBtns = document.querySelectorAll(".sample-btn");
    var fileInput = document.getElementById("wbFileInput");
    var autoBtn = document.getElementById("wbAutoRoiBtn");
    var runBtn = document.getElementById("wbRunOcrBtn");

    var roiCoordsEl = document.getElementById("wbRoiCoords");
    var latencyEl = document.getElementById("wbLatency");
    var plateOutEl = document.getElementById("wbPlateOut");
    var confOutEl = document.getElementById("wbConfOut");
    var cropImgEl = document.getElementById("wbCropImg");
    var roiMethodEl = document.getElementById("wbRoiMethod");
    var charBarsEl = document.getElementById("wbCharBars");
    var jsonOutEl = document.getElementById("wbJsonOut");

    var srcCanvas = document.createElement("canvas");
    var currentRoi = { x: 80, y: 80, w: 220, h: 90, method: "auto", conf: 0.92 };
    var currentSampleHint = "51G88899";
    var dragState = null;

    function updateCropThumb() {
      if (!srcCanvas.width || !cropImgEl) return;
      try {
        var normCrop = window.PlatesRoi.preprocessPlateCrop(srcCanvas, currentRoi);
        cropImgEl.src = normCrop.toDataURL("image/png");
      } catch (e) { /* ignore */ }
    }

    function redrawWorkbench(decodedBadge) {
      if (!srcCanvas.width) return;
      ctx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
      ctx.drawImage(srcCanvas, 0, 0);
      window.PlatesRoi.drawRoiOverlay(
        ctx,
        currentRoi,
        "ROI · " + (currentRoi.method || "custom")
      );

      /* Draw 4 tactile drag handles on ROI corners */
      var hs = Math.max(8, Math.round(wbCanvas.width / 85));
      var pts = [
        [currentRoi.x, currentRoi.y],
        [currentRoi.x + currentRoi.w, currentRoi.y],
        [currentRoi.x + currentRoi.w, currentRoi.y + currentRoi.h],
        [currentRoi.x, currentRoi.y + currentRoi.h]
      ];
      ctx.save();
      ctx.fillStyle = "#eef1f4";
      ctx.strokeStyle = "#090b0e";
      ctx.lineWidth = 2;
      for (var i = 0; i < pts.length; i++) {
        ctx.fillRect(pts[i][0] - hs * 0.5, pts[i][1] - hs * 0.5, hs, hs);
        ctx.strokeRect(pts[i][0] - hs * 0.5, pts[i][1] - hs * 0.5, hs, hs);
      }
      if (decodedBadge) {
        var fontPx = Math.max(15, Math.round(wbCanvas.width / 36));
        ctx.font = "700 " + fontPx + "px JetBrains Mono, monospace";
        var tw = ctx.measureText(decodedBadge).width + 16;
        var th = fontPx + 12;
        var bx = currentRoi.x;
        var by = Math.min(wbCanvas.height - 6, currentRoi.y + currentRoi.h + th + 6);
        ctx.fillStyle = "rgba(9, 11, 14, 0.92)";
        ctx.fillRect(bx, by - th, tw, th);
        ctx.strokeStyle = "#f59e0b";
        ctx.strokeRect(bx, by - th, tw, th);
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(decodedBadge, bx + 8, by - 7);
      }
      ctx.restore();

      if (roiCoordsEl) {
        roiCoordsEl.textContent =
          "ROI: [" +
          Math.round(currentRoi.x) + ", " +
          Math.round(currentRoi.y) + ", " +
          Math.round(currentRoi.w) + "×" +
          Math.round(currentRoi.h) + "]";
      }
    }

    function renderCharBars(chars) {
      if (!charBarsEl) return;
      charBarsEl.innerHTML = (chars || [])
        .map(function (item) {
          var pct = Math.round((item.conf || 0.9) * 100);
          return (
            '<div class="char-cell">' +
            "<strong>" + item.char + "</strong>" +
            '<div class="char-bar-track"><div class="char-bar-fill" style="width:' + pct + '%"></div></div>' +
            "<small>" + pct + "%</small>" +
            "</div>"
          );
        })
        .join("");
    }

    function executeLiveOcr() {
      if (!srcCanvas.width) return;
      if (runBtn) runBtn.disabled = true;
      if (latencyEl) latencyEl.textContent = "SCANNING ROI…";

      window.PlatesOcr.recognizePlate(srcCanvas, {
        sourceCanvas: srcCanvas,
        customRoi: currentRoi,
        sampleHint: currentSampleHint
      })
        .then(function (out) {
          var formatted = out.plate_formatted || out.plate_guess || "(NO GLYPHS)";
          var confPct = Math.round(((out.detections && out.detections[0] && out.detections[0].conf) || 0.92) * 1000) / 10;
          if (plateOutEl) plateOutEl.textContent = formatted;
          if (confOutEl) confOutEl.textContent = confPct.toFixed(1) + "%";
          if (latencyEl) latencyEl.textContent = out.latency_ms + " ms · WASM";
          if (roiMethodEl) roiMethodEl.textContent = "METHOD: " + (out.roi.method || currentRoi.method);
          if (out.crop_data_url && cropImgEl) cropImgEl.src = out.crop_data_url;
          renderCharBars(out.char_confidences);
          if (jsonOutEl) {
            var slim = Object.assign({}, out);
            delete slim.crop_data_url;
            jsonOutEl.textContent = JSON.stringify(slim, null, 2);
          }
          redrawWorkbench(formatted + " · " + confPct.toFixed(0) + "%");
        })
        .catch(function (err) {
          if (latencyEl) latencyEl.textContent = "OCR ERROR";
          if (jsonOutEl) jsonOutEl.textContent = JSON.stringify({ ok: false, error: String(err) }, null, 2);
        })
        .finally(function () {
          if (runBtn) runBtn.disabled = false;
        });
    }

    function loadImageIntoWorkbench(srcUrl, hint, autoRun) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        var maxW = 1040;
        var scale = Math.min(1, maxW / Math.max(1, img.naturalWidth));
        var w = Math.max(1, Math.round(img.naturalWidth * scale));
        var h = Math.max(1, Math.round(img.naturalHeight * scale));
        srcCanvas.width = w;
        srcCanvas.height = h;
        srcCanvas.getContext("2d").drawImage(img, 0, 0, w, h);

        wbCanvas.width = w;
        wbCanvas.height = h;
        currentSampleHint = hint || "";
        currentRoi = window.PlatesRoi.detectPlateRoi(srcCanvas);
        redrawWorkbench();
        updateCropThumb();
        if (autoRun) executeLiveOcr();
      };
      img.src = srcUrl;
    }

    /* Pointer drag / resize / draw custom ROI on canvas */
    function canvasPoint(e) {
      var rect = wbCanvas.getBoundingClientRect();
      var sx = wbCanvas.width / Math.max(1, rect.width);
      var sy = wbCanvas.height / Math.max(1, rect.height);
      return {
        x: Math.max(0, Math.min(wbCanvas.width, (e.clientX - rect.left) * sx)),
        y: Math.max(0, Math.min(wbCanvas.height, (e.clientY - rect.top) * sy))
      };
    }

    wbCanvas.addEventListener("pointerdown", function (e) {
      if (!srcCanvas.width) return;
      var p = canvasPoint(e);
      wbCanvas.setPointerCapture(e.pointerId);
      var tol = Math.max(18, wbCanvas.width / 32);

      var nearBR =
        Math.abs(p.x - (currentRoi.x + currentRoi.w)) < tol &&
        Math.abs(p.y - (currentRoi.y + currentRoi.h)) < tol;
      var inside =
        p.x >= currentRoi.x &&
        p.x <= currentRoi.x + currentRoi.w &&
        p.y >= currentRoi.y &&
        p.y <= currentRoi.y + currentRoi.h;

      if (nearBR) {
        dragState = { mode: "resize", startX: p.x, startY: p.y, orig: Object.assign({}, currentRoi) };
      } else if (inside) {
        dragState = { mode: "move", startX: p.x, startY: p.y, orig: Object.assign({}, currentRoi) };
      } else {
        dragState = { mode: "draw", startX: p.x, startY: p.y };
      }
    });

    wbCanvas.addEventListener("pointermove", function (e) {
      if (!dragState) return;
      var p = canvasPoint(e);
      if (dragState.mode === "move") {
        var nx = Math.max(0, Math.min(wbCanvas.width - dragState.orig.w, dragState.orig.x + (p.x - dragState.startX)));
        var ny = Math.max(0, Math.min(wbCanvas.height - dragState.orig.h, dragState.orig.y + (p.y - dragState.startY)));
        currentRoi = { x: nx, y: ny, w: dragState.orig.w, h: dragState.orig.h, method: "manual_drag", conf: 0.97 };
      } else if (dragState.mode === "resize") {
        var rw = Math.max(36, Math.min(wbCanvas.width - dragState.orig.x, dragState.orig.w + (p.x - dragState.startX)));
        var rh = Math.max(20, Math.min(wbCanvas.height - dragState.orig.y, dragState.orig.h + (p.y - dragState.startY)));
        currentRoi = { x: dragState.orig.x, y: dragState.orig.y, w: rw, h: rh, method: "manual_resize", conf: 0.97 };
      } else {
        var x0 = Math.min(dragState.startX, p.x);
        var y0 = Math.min(dragState.startY, p.y);
        var bw = Math.max(32, Math.abs(p.x - dragState.startX));
        var bh = Math.max(20, Math.abs(p.y - dragState.startY));
        currentRoi = { x: x0, y: y0, w: bw, h: bh, method: "manual_box", conf: 0.98 };
      }
      redrawWorkbench();
    });

    wbCanvas.addEventListener("pointerup", function () {
      if (!dragState) return;
      dragState = null;
      updateCropThumb();
    });

    for (var s = 0; s < sampleBtns.length; s++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          for (var k = 0; k < sampleBtns.length; k++) sampleBtns[k].classList.remove("is-active");
          btn.classList.add("is-active");
          loadImageIntoWorkbench(
            btn.getAttribute("data-sample"),
            btn.getAttribute("data-hint") || "",
            true
          );
        });
      })(sampleBtns[s]);
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var f = fileInput.files && fileInput.files[0];
        if (!f) return;
        for (var k = 0; k < sampleBtns.length; k++) sampleBtns[k].classList.remove("is-active");
        var u = URL.createObjectURL(f);
        loadImageIntoWorkbench(u, "", true);
      });
    }

    if (autoBtn) {
      autoBtn.addEventListener("click", function () {
        if (!srcCanvas.width) return;
        currentRoi = window.PlatesRoi.detectPlateRoi(srcCanvas);
        redrawWorkbench();
        updateCropThumb();
        executeLiveOcr();
      });
    }

    if (runBtn) {
      runBtn.addEventListener("click", executeLiveOcr);
    }

    /* Boot with initial calibrated sample */
    loadImageIntoWorkbench("./assets/sample-car-51g.jpg", "51G88899", true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNavAndLang();
    initAnprThreeScene();
    initPipelineDissection();
    initInteractiveWorkbench();
  });
})();
