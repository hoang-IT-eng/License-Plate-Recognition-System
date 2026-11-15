(function (global) {
  "use strict";

  var WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  function normalizePlate(text) {
    return String(text || "")
      .replace(/[^A-Z0-9\n ]/gi, "")
      .toUpperCase()
      .trim();
  }

  function plateGuess(words, fullText) {
    var joined = (words || [])
      .map(function (w) {
        return String(w.text || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
      })
      .filter(Boolean)
      .join("");
    if (joined) return joined;
    return normalizePlate(fullText).replace(/\s+/g, "");
  }

  /**
   * Run Tesseract on a canvas / File / Blob / ImageBitmap — never a revoked blob URL.
   */
  function recognizePlate(source) {
    if (!global.Tesseract || typeof global.Tesseract.recognize !== "function") {
      return Promise.reject(new Error("Tesseract.js not loaded"));
    }
    return global.Tesseract.recognize(source, "eng", {
      tessedit_char_whitelist: WHITELIST,
    }).then(function (result) {
      var data = result.data || {};
      var words = (data.words || [])
        .filter(function (w) {
          return (w.confidence || 0) > 60 && /[A-Z0-9]{3,}/i.test(w.text || "");
        })
        .map(function (w) {
          var b = w.bbox || {};
          return {
            bbox: [b.x0, b.y0, b.x1, b.y1],
            text: String(w.text || "").replace(/[^A-Z0-9]/gi, "").toUpperCase(),
            conf: Number(((w.confidence || 0) / 100).toFixed(4)),
            source: "tesseract_js",
          };
        });
      var fullText = normalizePlate(data.text);
      return {
        ok: true,
        runtime: "tesseract.js-browser",
        count: words.length,
        detections: words,
        full_text: fullText,
        plate_guess: plateGuess(words, fullText),
      };
    });
  }

  global.PlatesOcr = {
    recognizePlate: recognizePlate,
    normalizePlate: normalizePlate,
  };
})(typeof window !== "undefined" ? window : globalThis);
