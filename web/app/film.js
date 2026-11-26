/* Plates App — film layer.
   One opening move (letterbox bars part), a ticking camera timecode, and a
   viewfinder state machine the recognizer drives:
   idle → loaded → scanning → locked | nomatch | error.
   Reduced motion: bars start open, beam and timecode stay still. */
(function (global) {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  var REDUCED = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add(REDUCED ? "reduced" : "fx");

  var LABELS = {
    idle: "Standby",
    loaded: "Frame in",
    scanning: "Scanning",
    locked: "Plate locked",
    nomatch: "No plate read",
    error: "Error",
  };

  function $(id) { return doc.getElementById(id); }

  function state(name) {
    var vf = $("viewfinder");
    if (!vf) return;
    vf.setAttribute("data-state", name);
    var label = $("vfState");
    if (label) label.textContent = LABELS[name] || name;
  }

  /* The read lands on the same split-flap board as the landing's night
     chase (../flap.js). Long or empty reads fall back to plain text. */
  /* Fit the board to the readout card: glyph cells are 0.68·h wide,
     separators 0.26·h, gaps 0.08·h (see assets/flap.css). */
  function sizeBoard(out, text, box) {
    var cs = global.getComputedStyle(box);
    var w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;
    var seps = (text.match(/[^0-9A-Z]/g) || []).length;
    var units = (text.length - seps) * 0.68 + seps * 0.26 + (text.length - 1) * 0.08;
    var h = Math.max(22, Math.min(54, w / units));
    out.style.setProperty("--fl-h", h.toFixed(1) + "px");
  }
  function plate(text) {
    var box = $("plateRead");
    var out = $("plateBig");
    if (!box || !out) return;
    if (text === null) {
      box.setAttribute("data-state", "empty");
      out.classList.remove("flapboard2");
      out.textContent = "— — — —";
      return;
    }
    box.setAttribute("data-state", text ? "read" : "miss");
    var t = text ? String(text).toUpperCase().replace(/\s+/g, " ").trim() : "";
    if (t && t.length <= 12 && global.PlatesFlap) {
      sizeBoard(out, t, box);
      var board = global.PlatesFlap.create(out, { text: t });
      board.play(t);
      return;
    }
    out.classList.remove("flapboard2");
    out.textContent = text || "Not readable";
  }

  /* Timecode HH:MM:SS:FF at 24 fps, from page open. Paused when hidden. */
  function startTimecode() {
    var el = $("timecode");
    if (!el) return;
    var t0 = performance.now();
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    function draw() {
      var ms = performance.now() - t0;
      var s = Math.floor(ms / 1000);
      var f = Math.floor((ms % 1000) / (1000 / 24));
      el.textContent = pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60) + ":" + pad(f);
    }
    draw();
    if (REDUCED) return;
    var timer = setInterval(draw, 1000 / 12);
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) { clearInterval(timer); timer = null; }
      else if (!timer) { timer = setInterval(draw, 1000 / 12); }
    });
  }

  function open() {
    // Next frame so the closed state paints first, then the bars part.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.add("film-open"); });
    });
  }

  global.PlatesFilm = { state: state, plate: plate };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", function () { startTimecode(); open(); });
  } else { startTimecode(); open(); }
})(window);
