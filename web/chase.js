/* ════════════════════════════════════════════════════════════════════
   PLATES — NIGHT CHASE · hero controller
   Decides live vs static, pins the hero, loads Three.js + chase3d.js
   on demand and drives the DOM layer that rides on the 3D frame:
   · beats      — four short captions, one at a time
   · lock       — viewfinder corners fly in from the screen edges and
                  snap onto the plate (cyan while acquiring, amber locked)
   · crop       — the plate lifts out of the frame on its projected quad
                  and is warped flat (a CSS homography — the same idea as
                  cv2.warpPerspective in detect_v2.py)
   · read       — the split-flap board (flap.js) resolves 51G-888.99
   Static path (reduced motion, automation, software/low-end GPU, saveData,
   or any failure): no pin, the night still, the plate as plain text.
   QA flags: ?chase=on forces live (even on SwiftShader), ?chase=off
   forces static. window.__chaseState() / __chaseSnap(p) for screenshots.
   ════════════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";
  var doc = document, root = doc.documentElement;
  var PLATE = "51G-888.99";

  function $(id) { return doc.getElementById(id); }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Rect (0,0)-(w,h) → quad q[TL,TR,BR,BL] as a CSS matrix3d (Heckbert). */
  function homography(w, h, q) {
    var x0 = q[0][0], y0 = q[0][1], x1 = q[1][0], y1 = q[1][1];
    var x2 = q[2][0], y2 = q[2][1], x3 = q[3][0], y3 = q[3][1];
    var dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
    var sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    var den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(den) < 1e-9) return null;
    var g = (sx * dy2 - dx2 * sy) / den, hh = (dx1 * sy - sx * dy1) / den;
    var a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
    var d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
    a /= w; d /= w; g /= w; b /= h; e /= h; hh /= h;
    return "matrix3d(" + [a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1].map(function (v) { return +v.toFixed(6); }).join(",") + ")";
  }

  function probeGL() {
    try {
      var c = doc.createElement("canvas");
      var gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) return { ok: false };
      var ext = gl.getExtension("WEBGL_debug_renderer_info");
      var r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
      var lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
      return { ok: true, sw: /swiftshader|llvmpipe|software|basic render/i.test(r), renderer: r };
    } catch (e) { return { ok: false }; }
  }

  var E = {}, board = null, live = false, trigger = null, rawP = 0, size = { w: 1, h: 1 };
  var CROP_W = 520, CROP_H = 110;
  var BEATS = [[0.15, 0.37], [0.4, 0.61], [0.63, 0.8], [0.81, 1.5]];

  function measure() {
    size.w = E.hero.clientWidth || global.innerWidth;
    size.h = E.hero.clientHeight || global.innerHeight;
    var t = targetRect();
    var bw = t[1][0] - t[0][0];
    var cellH = Math.max(34, Math.min(96, bw / 6.7));
    E.board.style.setProperty("--fl-h", cellH.toFixed(1) + "px");
    E.read.style.top = (t[2][1] + Math.max(18, size.h * 0.03)) + "px";
  }
  /* Where the plate lands once it is flat: centred, upper-middle. */
  function targetRect() {
    var narrow = size.w < 760;
    var w = narrow ? size.w * 0.84 : Math.min(size.w * 0.42, 620);
    var h = w * CROP_H / CROP_W;
    var cx = size.w / 2, cy = size.h * (narrow ? 0.36 : 0.38);
    return [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
  }

  var lastBoardP = -1;
  function render(p, quad) {
    /* opening copy hands the frame to the car */
    var out = smooth(0.05, 0.17, p);
    E.content.style.opacity = String(1 - out);
    E.content.style.transform = "translate3d(0," + (-out * 48).toFixed(1) + "px,0)";
    E.content.style.visibility = out >= 1 ? "hidden" : "";
    if (E.cue) E.cue.style.opacity = String(1 - smooth(0.01, 0.06, p));

    for (var i = 0; i < E.beats.length; i++) {
      var w = BEATS[i];
      var a = smooth(w[0], w[0] + 0.035, p) * (1 - smooth(w[1] - 0.035, w[1], p));
      E.beats[i].style.opacity = a.toFixed(3);
      E.beats[i].style.transform = "translate3d(0," + ((1 - a) * 18).toFixed(1) + "px,0)";
      E.beats[i].style.visibility = a <= 0.001 ? "hidden" : "visible";
    }

    var lockT = smooth(0.44, 0.54, p);
    var deskT = easeInOut(clamp01((p - 0.64) / 0.14));
    var tgt = targetRect();
    var q = quad;
    if (!q) { /* engine not up yet: hold the plate where it will appear */
      var c = [size.w / 2, size.h * 0.5], hw = size.w * 0.14, hh = hw * CROP_H / CROP_W;
      q = [[c[0] - hw, c[1] - hh], [c[0] + hw, c[1] - hh * 0.9], [c[0] + hw, c[1] + hh * 0.9], [c[0] - hw, c[1] + hh]];
    }
    var cq = q.map(function (pt, k) { return [lerp(pt[0], tgt[k][0], deskT), lerp(pt[1], tgt[k][1], deskT)]; });

    var cropOn = p > 0.635 && !!quad; /* the crop needs the real plate canvas from the engine */
    E.crop.style.visibility = cropOn ? "visible" : "hidden";
    if (cropOn) {
      var m = homography(CROP_W, CROP_H, cq);
      if (m) E.crop.style.transform = m;
      E.crop.style.opacity = smooth(0.635, 0.665, p).toFixed(3);
      E.crop.classList.toggle("is-clean", p > 0.76);
    }

    /* viewfinder corners: from the screen edges onto the plate's bbox */
    var src = cropOn ? cq : q;
    var minX = Math.min(src[0][0], src[3][0]), maxX = Math.max(src[1][0], src[2][0]);
    var minY = Math.min(src[0][1], src[1][1]), maxY = Math.max(src[2][1], src[3][1]);
    var pad = Math.max(10, (maxX - minX) * 0.055);
    var box = [[minX - pad, minY - pad], [maxX + pad, minY - pad], [maxX + pad, maxY + pad], [minX - pad, maxY + pad]];
    var inset = 28;
    var from = [[inset, inset + 40], [size.w - inset, inset + 40], [size.w - inset, size.h - inset], [inset, size.h - inset]];
    var lk = easeOut(lockT);
    E.lock.style.visibility = lockT > 0 ? "visible" : "hidden";
    E.lock.style.opacity = lockT > 0 ? String(Math.min(1, lockT * 3)) : "0";
    for (var k = 0; k < 4; k++) {
      var x = lerp(from[k][0], box[k][0], lk), y = lerp(from[k][1], box[k][1], lk);
      E.corners[k].style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    }
    var locked = p >= 0.54;
    if (locked !== E.lock.classList.contains("is-locked")) E.lock.classList.toggle("is-locked", locked);
    E.tag.style.transform = "translate3d(" + box[0][0].toFixed(1) + "px," + (box[0][1] - 26).toFixed(1) + "px,0)";

    E.dim.style.opacity = (0.6 * smooth(0.64, 0.8, p)).toFixed(3);

    var readA = smooth(0.79, 0.83, p);
    E.read.style.opacity = readA.toFixed(3);
    E.read.style.visibility = readA <= 0 ? "hidden" : "visible";
    var bp = smooth(0.82, 0.95, p);
    if (Math.abs(bp - lastBoardP) > 0.001) { board.scrub(bp); lastBoardP = bp; }
  }

  function toStatic() {
    live = false;
    root.classList.remove("chase-live");
    root.classList.add("chase-static");
    if (trigger) { trigger.kill(true); trigger = null; }
    ["content", "crop", "lock", "read", "dim"].forEach(function (k) { if (E[k]) E[k].removeAttribute("style"); });
    E.beats.forEach(function (b) { b.removeAttribute("style"); });
    board.show(PLATE);
    if (global.ScrollTrigger) global.ScrollTrigger.refresh();
    global.dispatchEvent(new CustomEvent("plates-chase-ready"));
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = doc.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = reject;
      doc.head.appendChild(s);
    });
  }

  function boot(opts) {
    E.hero = $("top");
    if (!E.hero) return;
    E.canvas = $("heroCanvas");
    E.content = E.hero.querySelector(".hero__content");
    E.cue = E.hero.querySelector(".hero__cue");
    E.lock = $("chaseLock");
    E.corners = E.lock ? E.lock.querySelectorAll(".chase__corner") : [];
    E.tag = $("chaseTag");
    E.crop = $("chaseCrop");
    E.cropCanvas = $("chaseCropCanvas");
    E.read = $("chaseRead");
    E.dim = $("chaseDim");
    E.beats = Array.prototype.slice.call(E.hero.querySelectorAll(".chase__beat"));
    E.board = $("chaseBoard");
    board = global.PlatesFlap.create(E.board, { text: PLATE });

    var param = null;
    try { param = new URLSearchParams(global.location.search).get("chase"); } catch (e) { /* ignore */ }
    var force = param === "on";
    var lowEnd = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory && navigator.deviceMemory <= 2);
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var gl = probeGL();
    var ok = param !== "off" && opts.hasGsap && gl.ok &&
      (force || (!opts.motionOff && !lowEnd && !saveData && !gl.sw));
    if (!ok) { toStatic(); return; }

    live = true;
    root.classList.add("chase-live");
    var mobile = global.matchMedia("(max-width: 760px)").matches;
    measure();
    global.addEventListener("resize", measure);
    render(0, null);

    var gsap = global.gsap;
    gsap.registerPlugin(global.ScrollTrigger);
    global.ScrollTrigger.config({ ignoreMobileResize: true });
    trigger = global.ScrollTrigger.create({
      trigger: E.hero, start: "top top", end: "+=" + (mobile ? 320 : 430) + "%",
      pin: true, anticipatePin: 1,
      onUpdate: function (self) {
        rawP = self.progress;
        if (global.PlatesChase3D && global.PlatesChase3D.isReady()) global.PlatesChase3D.setProgress(rawP);
        else render(rawP, null);
      }
    });

    loadScript("./assets/vendor/three.min.js").then(function () {
      return loadScript("./chase3d.js");
    }).then(function () {
      var C = global.PlatesChase3D;
      if (!live || !C || !C.init(E.canvas, { mobile: mobile, force: force })) throw new Error("chase init");
      /* the DOM crop shows the very same plate canvas the 3D car carries */
      var pc = C.getPlateCanvas();
      if (pc && E.cropCanvas) {
        E.cropCanvas.width = pc.width; E.cropCanvas.height = pc.height;
        E.cropCanvas.getContext("2d").drawImage(pc, 0, 0);
      }
      C.setProgress(rawP); C.snap(rawP);
      C.onFrame(function (s) { render(s.ps, s.quad); });
      var visible = true;
      if ("IntersectionObserver" in global) {
        new IntersectionObserver(function (en) {
          visible = en[0].isIntersecting;
          if (visible && !doc.hidden) C.start(); else C.stop();
        }, { threshold: 0 }).observe(E.hero);
      }
      doc.addEventListener("visibilitychange", function () {
        if (doc.hidden) C.stop(); else if (visible && live) C.start();
      });
      C.start();
    }).catch(function () { toStatic(); });

    global.addEventListener("plates-chase-fallback", function () { if (live) toStatic(); });
  }

  global.PlatesChase = { boot: boot, plate: PLATE };
  global.__chaseState = function () {
    return {
      mode: root.classList.contains("chase-live") ? "live" : (root.classList.contains("chase-static") ? "static" : "pending"),
      rawP: +rawP.toFixed(3),
      engine: global.PlatesChase3D ? global.PlatesChase3D.state() : null
    };
  };
  global.__chaseSnap = function (p) { if (global.PlatesChase3D) global.PlatesChase3D.snap(p); };
})(window);
