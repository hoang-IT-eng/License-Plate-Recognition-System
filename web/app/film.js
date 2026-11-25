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

  function plate(text) {
    var box = $("plateRead");
    var out = $("plateBig");
    if (!box || !out) return;
    if (text === null) {
      box.setAttribute("data-state", "empty");
      out.textContent = "— — — —";
      return;
    }
    box.setAttribute("data-state", text ? "read" : "miss");
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
