/* PLATES — split-flap board (airport departures style).
   One module, two drivers:
   · scrub(p)   — deterministic, scroll-scrubbed (landing night chase)
   · play(text) — time-based, for live results (/app/ readout)
   Each glyph cell is four halves: the static top shows the incoming
   glyph, the static bottom the outgoing one, and two leaves fold over
   the hinge. Separators ("-", ".", " ") are narrow, fixed cells.
   Reduced motion: show(text) — the final string, no flipping.
   window.PlatesFlap.create(container, { text }) → board */
(function (global) {
  "use strict";
  var ORDER = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var REDUCED = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SEP = /[^0-9A-Z]/;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function half(cls, ch) {
    var h = el("span", "fl-half " + cls);
    h.appendChild(el("i", null, ch));
    return h;
  }

  /* The glyph path a cell runs through before it lands on its target:
     a short, deterministic run of ORDER ending at the target (real
     boards cycle in a fixed order). Length varies a little per cell so
     the board does not settle in lockstep. */
  function pathFor(target, i) {
    var to = ORDER.indexOf(target);
    if (to < 0) return [target];
    var len = 6 + ((i * 7) % 5);
    var out = [];
    for (var k = len; k >= 0; k--) {
      var idx = to - k;
      while (idx < 0) idx += ORDER.length;
      out.push(ORDER.charAt(idx));
    }
    out[0] = " ";
    return out;
  }

  function Cell(ch, i) {
    this.i = i;
    this.sep = SEP.test(ch);
    this.target = ch;
    this.cur = this.sep ? ch : " ";
    this.node = el("span", "fl-cell" + (this.sep ? " fl-cell--sep" : ""));
    if (this.sep) {
      this.node.appendChild(el("span", "fl-sep", ch === " " ? "\u00a0" : ch));
      return;
    }
    this.top = half("fl-top", " ");
    this.bot = half("fl-bot", " ");
    this.leafTop = half("fl-leaf fl-leaf--top", " ");
    this.leafBot = half("fl-leaf fl-leaf--bot", " ");
    this.node.appendChild(this.top);
    this.node.appendChild(this.bot);
    this.node.appendChild(this.leafTop);
    this.node.appendChild(this.leafBot);
    this.path = pathFor(ch, i);
    this.lastFlip = 0;
  }
  Cell.prototype.paint = function (ch, animate, dur) {
    if (this.sep || ch === this.cur) return;
    var prev = this.cur;
    this.cur = ch;
    var g = ch === " " ? "\u00a0" : ch;
    var pg = prev === " " ? "\u00a0" : prev;
    this.top.firstChild.textContent = g;
    clearTimeout(this._t); /* a stale fold must never repaint the bottom half */
    if (!animate || REDUCED) {
      this.bot.firstChild.textContent = g;
      this.leafTop.firstChild.textContent = g;
      this.leafBot.firstChild.textContent = g;
      this.node.classList.remove("is-flipping");
      return;
    }
    this.bot.firstChild.textContent = pg;
    this.leafTop.firstChild.textContent = pg;
    this.leafBot.firstChild.textContent = g;
    this.node.style.setProperty("--fl-d", (dur || 90) + "ms");
    this.node.classList.remove("is-flipping");
    void this.node.offsetWidth; /* restart the fold */
    this.node.classList.add("is-flipping");
    var self = this;
    this._t = setTimeout(function () {
      self.bot.firstChild.textContent = g;
      self.node.classList.remove("is-flipping");
    }, (dur || 90) + 20);
  };
  Cell.prototype.settle = function (on) {
    this.node.classList.toggle("is-settled", !!on);
  };

  function Board(container, opts) {
    this.root = container;
    this.root.classList.add("flapboard2");
    this.cells = [];
    this.setText((opts && opts.text) || "");
  }
  Board.prototype.setText = function (text) {
    this.text = String(text || "").toUpperCase();
    this.root.textContent = "";
    this.cells = [];
    for (var i = 0; i < this.text.length; i++) {
      var c = new Cell(this.text.charAt(i), i);
      c.node.setAttribute("aria-hidden", "true"); /* the flipping glyphs are noise to a screen reader */
      this.cells.push(c);
      this.root.appendChild(c.node);
    }
    this.root.appendChild(el("span", "fl-sr", this.text));
    this.root.setAttribute("aria-label", this.text);
    this.root.setAttribute("data-len", String(this.text.length));
    return this;
  };
  /* p in [0, 1]: each cell walks its path inside its own window of the
     progress; at p = 1 every cell has settled on its target. */
  Board.prototype.scrub = function (p) {
    var now = performance.now();
    var glyphs = this.cells.filter(function (c) { return !c.sep; });
    var n = glyphs.length;
    glyphs.forEach(function (c, k) {
      var start = (k / Math.max(1, n)) * 0.45;
      var local = p >= 1 ? 1 : Math.max(0, Math.min(1, (p - start) / 0.55));
      var idx = Math.min(c.path.length - 1, Math.floor(local * (c.path.length - 1) + 1e-6));
      var ch = local <= 0 ? " " : c.path[idx];
      /* Cap the fold rate so a fast scroll reads as flipping, not noise. */
      var animate = !REDUCED && now - c.lastFlip > 45;
      if (ch !== c.cur) { c.paint(ch, animate, 80); c.lastFlip = now; }
      c.settle(local >= 1);
    });
    this.cells.forEach(function (c) { if (c.sep) c.node.classList.toggle("is-on", p > 0.5); });
  };
  Board.prototype.show = function (text) {
    if (text != null && String(text).toUpperCase() !== this.text) this.setText(text);
    this.cells.forEach(function (c) { if (!c.sep) c.paint(c.target, false); c.settle(true); if (c.sep) c.node.classList.add("is-on"); });
    return Promise.resolve();
  };
  Board.prototype.play = function (text, opts) {
    if (text != null) this.setText(text);
    if (REDUCED) return this.show();
    var step = (opts && opts.step) || 62;
    var stagger = (opts && opts.stagger) || 70;
    var self = this;
    self._run = (self._run || 0) + 1;
    var run = self._run;
    var glyphs = this.cells.filter(function (c) { return !c.sep; });
    return new Promise(function (resolve) {
      var pending = glyphs.length;
      if (!pending) { self.show(); resolve(); return; }
      glyphs.forEach(function (c, k) {
        var j = 0;
        function tick() {
          if (run !== self._run) return;
          j++;
          if (j >= c.path.length) {
            c.settle(true);
            if (--pending === 0) {
              self.cells.forEach(function (s) { if (s.sep) s.node.classList.add("is-on"); });
              resolve();
            }
            return;
          }
          var last = j === c.path.length - 1;
          c.paint(c.path[j], true, last ? 150 : step - 8);
          setTimeout(tick, last ? 150 : step);
        }
        setTimeout(tick, k * stagger);
      });
    });
  };

  global.PlatesFlap = {
    create: function (container, opts) { return new Board(container, opts); }
  };
})(window);
