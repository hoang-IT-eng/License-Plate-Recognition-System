/* ════════════════════════════════════════════════════════════════════
   PLATES — Night Checkpoint live demo.
   Browser pipeline: the project's own ROI detector (app/plate-roi.js)
   + Tesseract.js. The Tesseract engine is loaded ONLY on demand
   (prefetched on hover intent) and its worker is created once and
   reused. Results shown are the engine's real outputs: formatted
   plate, raw string, ROI method, measured latency. No confidence
   values are displayed — Tesseract word scores are not plate truth,
   and the Python pipeline's numbers are not reproduced here.
   ════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var TESSERACT_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  var WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.";

  var els = {};
  var worker = null;
  var engineState = "idle"; // idle | loading | ready | error
  var sourceCanvas = null;
  var sourceName = "";
  var busy = false;

  function t(key) {
    return (global.PlatesI18N && global.PlatesI18N.t(key)) || key;
  }

  function setStatus(msg, mode) {
    els.status.textContent = msg;
    els.status.classList.toggle("is-busy", mode === "busy");
    els.status.classList.toggle("is-error", mode === "error");
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  var localScriptsPromise = null;
  function ensureLocalScripts() {
    if (global.PlatesRoi && global.PlatesOcr) return Promise.resolve();
    if (!localScriptsPromise) {
      localScriptsPromise = loadScript("./app/plate-roi.js").then(function () {
        return loadScript("./app/ocr.js");
      });
    }
    return localScriptsPromise;
  }

  var tessPrefetched = false;
  function prefetchEngine() {
    if (tessPrefetched || global.Tesseract) { tessPrefetched = true; return; }
    tessPrefetched = true;
    loadScript(TESSERACT_SRC).catch(function () { tessPrefetched = false; });
  }

  function ensureWorker() {
    if (worker) return Promise.resolve(worker);
    if (!global.Tesseract) {
      return loadScript(TESSERACT_SRC).then(ensureWorker);
    }
    setStatus(t("demo_status_loading"), "busy");
    return global.Tesseract.createWorker("eng").then(function (w) {
      worker = w;
      return worker.setParameters({
        tessedit_char_whitelist: WHITELIST,
        tessedit_pageseg_mode: "6"
      });
    }).then(function () {
      engineState = "ready";
      return worker;
    });
  }

  function imageToCanvas(source) {
    return new Promise(function (resolve, reject) {
      var url = null;
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        var maxSide = 1400;
        var scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        if (url) URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = function () {
        if (url) URL.revokeObjectURL(url);
        reject(new Error("decode"));
      };
      if (typeof Blob !== "undefined" && source instanceof Blob) {
        url = URL.createObjectURL(source);
        img.src = url;
      } else {
        img.src = source;
      }
    });
  }

  function setSource(canvas, name) {
    sourceCanvas = canvas;
    sourceName = name || "";
    els.run.disabled = false;
    els.previewWrap.hidden = false;
    var pv = els.preview;
    pv.width = canvas.width;
    pv.height = canvas.height;
    pv.getContext("2d").drawImage(canvas, 0, 0);
    setStatus(t("demo_status_ready"), "");
    els.error.hidden = true;
  }

  function scoreGuess(text) {
    var s = 0;
    if (/^\d{2}[A-Z]/.test(text)) s += 6;
    if (/\d{4,}/.test(text)) s += 4;
    if (/\d/.test(text)) s += 2;
    if (text.length >= 7 && text.length <= 10) s += 3;
    return s;
  }

  function run() {
    if (busy || !sourceCanvas) return;
    busy = true;
    els.run.disabled = true;
    els.error.hidden = true;
    var t0 = performance.now();

    ensureLocalScripts()
      .then(ensureWorker)
      .then(function (w) {
        setStatus(t("demo_status_reading"), "busy");
        var roi = global.PlatesRoi.detectPlateRoi(sourceCanvas);
        var variants = (typeof global.PlatesRoi.preprocessPlateCropVariants === "function")
          ? global.PlatesRoi.preprocessPlateCropVariants(sourceCanvas, roi)
          : [global.PlatesRoi.preprocessPlateCrop(sourceCanvas, roi)];

        /* draw preview + ROI overlay */
        var pv = els.preview;
        pv.width = sourceCanvas.width;
        pv.height = sourceCanvas.height;
        var pctx = pv.getContext("2d");
        pctx.drawImage(sourceCanvas, 0, 0);
        global.PlatesRoi.drawRoiOverlay(pctx, roi, "ROI · " + (roi.method || "auto"));

        return Promise.all(variants.map(function (crop) { return w.recognize(crop); }))
          .then(function (results) {
            var best = null, bestScore = -1;
            results.forEach(function (r) {
              var raw = (r.data.text || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
              var sc = scoreGuess(raw);
              if (sc > bestScore) { bestScore = sc; best = raw; }
            });
            return { raw: best || "", roi: roi };
          });
      })
      .then(function (out) {
        var ms = Math.round(performance.now() - t0);
        var formatted = global.PlatesOcr.formatVnPlate(out.raw || "");
        els.plate.textContent = formatted || out.raw || "—";
        els.raw.textContent = out.raw || "—";
        els.roi.textContent = out.roi.method || "auto";
        els.time.textContent = ms + " ms";
        if (!out.raw) {
          els.error.hidden = false;
          els.error.textContent = t("demo_err_noread");
          setStatus(t("demo_status_done"), "error");
        } else {
          setStatus(t("demo_status_done"), "");
        }
      })
      .catch(function () {
        els.error.hidden = false;
        els.error.textContent = t("demo_err_engine");
        setStatus(t("demo_status_error"), "error");
      })
      .then(function () {
        busy = false;
        els.run.disabled = false;
      });
  }

  function init() {
    els = {
      drop: document.getElementById("demoDrop"),
      file: document.getElementById("demoFile"),
      label: document.getElementById("demoDropLabel"),
      run: document.getElementById("demoRun"),
      status: document.getElementById("demoStatus"),
      previewWrap: document.getElementById("demoPreviewWrap"),
      preview: document.getElementById("demoPreview"),
      plate: document.getElementById("demoPlate"),
      raw: document.getElementById("demoRaw"),
      roi: document.getElementById("demoRoi"),
      time: document.getElementById("demoTime"),
      error: document.getElementById("demoError")
    };
    if (!els.drop) return;

    /* visible focus ring for the visually-hidden file input */
    els.file.addEventListener("focus", function () {
      els.label.style.outline = "2px solid var(--amber)";
      els.label.style.outlineOffset = "4px";
    });
    els.file.addEventListener("blur", function () {
      els.label.style.outline = "";
    });

    els.file.addEventListener("change", function () {
      var f = els.file.files && els.file.files[0];
      if (!f) return;
      imageToCanvas(f).then(function (c) { setSource(c, f.name); })
        .catch(function () {
          els.error.hidden = false;
          els.error.textContent = t("demo_err_decode");
        });
    });

    ["dragenter", "dragover"].forEach(function (ev) {
      els.drop.addEventListener(ev, function (e) {
        e.preventDefault();
        els.drop.classList.add("is-drag");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      els.drop.addEventListener(ev, function (e) {
        e.preventDefault();
        els.drop.classList.remove("is-drag");
      });
    });
    els.drop.addEventListener("drop", function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) {
        imageToCanvas(f).then(function (c) { setSource(c, f.name); })
          .catch(function () {
            els.error.hidden = false;
            els.error.textContent = t("demo_err_decode");
          });
      }
    });

    document.querySelectorAll("[data-sample]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-sample]").forEach(function (b) { b.classList.remove("is-picked"); });
        btn.classList.add("is-picked");
        setStatus(t("demo_status_sample"), "busy");
        fetch(btn.getAttribute("data-sample"))
          .then(function (r) { return r.blob(); })
          .then(imageToCanvas)
          .then(function (c) { setSource(c, btn.textContent.trim()); run(); })
          .catch(function () {
            els.error.hidden = false;
            els.error.textContent = t("demo_err_decode");
            setStatus(t("demo_status_error"), "error");
          });
      });
      btn.addEventListener("pointerover", prefetchEngine);
    });

    els.run.addEventListener("click", run);
    els.drop.addEventListener("pointerover", prefetchEngine);
    ensureLocalScripts().catch(function () { /* retried on run */ });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
