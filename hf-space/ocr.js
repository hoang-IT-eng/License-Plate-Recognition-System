(function (global) {
  "use strict";

  var WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var NOISE = /^(VIETNAM|VIET|NAM|VN|PLATE|OCR|SAMPLE)$/i;
  // VN plate-ish: starts with 2 digits + letter, or has a long digit run
  var PLATEY = /(?:\d{2}[A-Z]\d?[A-Z0-9]*)|(?:\d{4,})/;

  function normalizePlate(text) {
    return String(text || "")
      .replace(/[^A-Z0-9\n ]/gi, "")
      .toUpperCase()
      .trim();
  }

  function cleanToken(t) {
    return String(t || "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();
  }

  function plateGuess(words, fullText) {
    var tokens = (words || [])
      .map(function (w) {
        return cleanToken(w.text);
      })
      .filter(function (t) {
        return t && t.length >= 2 && !NOISE.test(t);
      });

    var joined = tokens.join("");
    if (joined && PLATEY.test(joined)) return joined;
    if (joined && /\d/.test(joined)) return joined;

    var fromFull = normalizePlate(fullText)
      .split(/[\s\n]+/)
      .map(cleanToken)
      .filter(function (t) {
        return t && !NOISE.test(t);
      });
    var fullJoined = fromFull.join("");
    if (fullJoined && PLATEY.test(fullJoined)) return fullJoined;
    if (fullJoined && /\d/.test(fullJoined)) return fullJoined;

    // Last resort: strip noise words from raw full text
    var raw = cleanToken(normalizePlate(fullText).replace(/\s+/g, ""));
    raw = raw.replace(/VIETNAM/g, "").replace(/VIET/g, "").replace(/NAM/g, "");
    return raw || joined || fullJoined || "";
  }

  function canvasFromSource(source) {
    if (source && source.tagName === "CANVAS") {
      return Promise.resolve(source);
    }
    return new Promise(function (resolve, reject) {
      var url = null;
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        if (url) URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = function () {
        if (url) URL.revokeObjectURL(url);
        reject(new Error("Failed to decode image for ROI OCR"));
      };
      if (typeof Blob !== "undefined" && source instanceof Blob) {
        url = URL.createObjectURL(source);
        img.src = url;
      } else if (typeof source === "string") {
        img.src = source;
      } else {
        reject(new Error("Unsupported OCR source"));
      }
    });
  }

  function tesseractOnCanvas(canvas, psm) {
    if (!global.Tesseract || typeof global.Tesseract.recognize !== "function") {
      return Promise.reject(new Error("Tesseract.js not loaded"));
    }
    return global.Tesseract.recognize(canvas, "eng", {
      tessedit_char_whitelist: WHITELIST,
      tessedit_pageseg_mode: String(psm || "6"),
    }).then(function (result) {
      return result.data || {};
    });
  }

  function wordsFromData(data) {
    return (data.words || [])
      .filter(function (w) {
        var t = cleanToken(w.text);
        return (w.confidence || 0) > 40 && t.length >= 2 && !NOISE.test(t);
      })
      .map(function (w) {
        return {
          text: cleanToken(w.text),
          conf: Number(((w.confidence || 0) / 100).toFixed(4)),
          source: "tesseract_js_crop",
        };
      });
  }

  function pickBestOcr(results) {
    var best = results[0];
    var bestScore = -1;
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var guess = plateGuess(r.words, r.fullText);
      var score = 0;
      if (/\d{2}[A-Z]/.test(guess)) score += 5;
      if (/\d{4,}/.test(guess)) score += 4;
      if (/\d/.test(guess)) score += 2;
      if (guess.length >= 6 && guess.length <= 12) score += 2;
      if (NOISE.test(guess)) score -= 5;
      score += Math.min(3, r.words.length);
      if (score > bestScore) {
        bestScore = score;
        best = r;
        best.guess = guess;
      }
    }
    best.guess = best.guess || plateGuess(best.words, best.fullText);
    return best;
  }

  /**
   * Plate ROI → preprocess → OCR on crop only (not full-frame).
   * @param {HTMLCanvasElement|Blob|File} source
   * @param {{drawOn?: CanvasRenderingContext2D, sourceCanvas?: HTMLCanvasElement}} [opts]
   */
  function recognizePlate(source, opts) {
    opts = opts || {};
    return canvasFromSource(opts.sourceCanvas || source).then(function (fullCanvas) {
      var roiApi = global.PlatesRoi;
      if (!roiApi) {
        return Promise.reject(new Error("PlatesRoi not loaded"));
      }
      var roi = roiApi.detectPlateRoi(fullCanvas);
      var variants =
        typeof roiApi.preprocessPlateCropVariants === "function"
          ? roiApi.preprocessPlateCropVariants(fullCanvas, roi)
          : [roiApi.preprocessPlateCrop(fullCanvas, roi)];

      if (opts.drawOn) {
        try {
          opts.drawOn.drawImage(fullCanvas, 0, 0);
        } catch (e) {
          /* ignore */
        }
        roiApi.drawRoiOverlay(opts.drawOn, roi, "ROI");
      }

      // OCR each crop variant (PSM 6); keep digit-heavy plate guess
      return Promise.all(
        variants.map(function (crop) {
          return tesseractOnCanvas(crop, "6");
        })
      ).then(function (datas) {
        var parsed = datas.map(function (data) {
          return {
            words: wordsFromData(data),
            fullText: normalizePlate(data.text),
          };
        });
        var best = pickBestOcr(parsed);
        var guess = best.guess || "";
        var detConf = Number(
          (
            best.words.reduce(function (a, w) {
              return a + (w.conf || 0);
            }, 0) / Math.max(1, best.words.length) || roi.conf || 0.5
          ).toFixed(4)
        );

        var detections = [
          {
            bbox: [roi.x, roi.y, roi.x + roi.w, roi.y + roi.h],
            text: guess,
            conf: detConf,
            source: "roi_" + (roi.method || "detect") + "+tesseract",
            roi_method: roi.method,
            roi_conf: Number((roi.conf || 0).toFixed(4)),
          },
        ];

        if (opts.drawOn && guess) {
          var ctx = opts.drawOn;
          ctx.save();
          ctx.fillStyle = "#22d3ee";
          ctx.font = Math.max(16, Math.round(fullCanvas.width / 28)) + "px sans-serif";
          ctx.fillText(guess, roi.x, Math.max(20, roi.y - 8));
          ctx.restore();
        }

        return {
          ok: true,
          runtime: "tesseract.js-browser+roi",
          note: "Client plate ROI → preprocess → OCR crop only (YOLO skipped on F1 / HF static)",
          count: detections.length,
          detections: detections,
          roi: {
            bbox: [roi.x, roi.y, roi.x + roi.w, roi.y + roi.h],
            method: roi.method,
            conf: Number((roi.conf || 0).toFixed(4)),
          },
          full_text: best.fullText,
          plate_guess: guess,
          words: best.words,
        };
      });
    });
  }

  global.PlatesOcr = {
    recognizePlate: recognizePlate,
    normalizePlate: normalizePlate,
  };
})(typeof window !== "undefined" ? window : globalThis);
