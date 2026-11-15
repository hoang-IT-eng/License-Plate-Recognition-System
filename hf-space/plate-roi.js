(function (global) {
  "use strict";

  /**
   * Lightweight client-side plate ROI detector for Azure F1 / HF static.
   * Cascade methods (best score wins):
   *  1) bright rectangular blob (white/yellow plates on darker scene)
   *  2) edge-density sliding windows (contour / aspect heuristics)
   *  3) full-frame fallback when the upload is already a tight crop
   */

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function toGray(data, w, h) {
    var g = new Float32Array(w * h);
    for (var i = 0, p = 0; i < data.length; i += 4, p++) {
      g[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return g;
  }

  function downsample(srcCanvas, maxSide) {
    var sw = srcCanvas.width;
    var sh = srcCanvas.height;
    var scale = Math.min(1, maxSide / Math.max(sw, sh));
    var w = Math.max(1, Math.round(sw * scale));
    var h = Math.max(1, Math.round(sh * scale));
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(srcCanvas, 0, 0, w, h);
    return { canvas: c, ctx: ctx, scale: scale, w: w, h: h };
  }

  function integral(gray, w, h) {
    var ii = new Float64Array((w + 1) * (h + 1));
    for (var y = 1; y <= h; y++) {
      var row = 0;
      for (var x = 1; x <= w; x++) {
        row += gray[(y - 1) * w + (x - 1)];
        ii[y * (w + 1) + x] = ii[(y - 1) * (w + 1) + x] + row;
      }
    }
    return ii;
  }

  function rectSum(ii, w, x0, y0, x1, y1) {
    // inclusive-exclusive in image coords; ii is (w+1)*(h+1)
    var stride = w + 1;
    return (
      ii[y1 * stride + x1] -
      ii[y0 * stride + x1] -
      ii[y1 * stride + x0] +
      ii[y0 * stride + x0]
    );
  }

  function sobelMag(gray, w, h) {
    var mag = new Float32Array(w * h);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = y * w + x;
        var gx =
          -gray[i - w - 1] +
          gray[i - w + 1] -
          2 * gray[i - 1] +
          2 * gray[i + 1] -
          gray[i + w - 1] +
          gray[i + w + 1];
        var gy =
          -gray[i - w - 1] -
          2 * gray[i - w] -
          gray[i - w + 1] +
          gray[i + w - 1] +
          2 * gray[i + w] +
          gray[i + w + 1];
        mag[i] = Math.abs(gx) + Math.abs(gy);
      }
    }
    return mag;
  }

  function scoreWindow(gray, edges, iiGray, iiEdge, w, h, x0, y0, bw, bh) {
    var x1 = x0 + bw;
    var y1 = y0 + bh;
    if (x0 < 1 || y0 < 1 || x1 >= w - 1 || y1 >= h - 1) return null;
    var area = bw * bh;
    if (area < 80) return null;

    var aspect = bw / bh;
    // VN car plates ~3–5; moto two-line ~1.0–2.4
    var aspectScore = 0;
    if (aspect >= 1.0 && aspect <= 2.6) aspectScore = 1.0; // moto-ish
    else if (aspect > 2.6 && aspect <= 5.5) aspectScore = 0.95; // car-ish
    else if (aspect >= 0.75 && aspect < 1.0) aspectScore = 0.55;
    else return null;

    var mean = rectSum(iiGray, w, x0, y0, x1, y1) / area;
    var edgeMean = rectSum(iiEdge, w, x0, y0, x1, y1) / area;

    // Border edge ring vs interior — plates have strong rectangular borders/glyphs
    var pad = Math.max(1, Math.floor(Math.min(bw, bh) * 0.12));
    var ix0 = x0 + pad;
    var iy0 = y0 + pad;
    var ix1 = x1 - pad;
    var iy1 = y1 - pad;
    var borderArea = area - Math.max(1, (ix1 - ix0) * (iy1 - iy0));
    var borderEdge =
      (rectSum(iiEdge, w, x0, y0, x1, y1) -
        (ix1 > ix0 && iy1 > iy0 ? rectSum(iiEdge, w, ix0, iy0, ix1, iy1) : 0)) /
      borderArea;
    var interiorEdge =
      ix1 > ix0 && iy1 > iy0
        ? rectSum(iiEdge, w, ix0, iy0, ix1, iy1) / ((ix1 - ix0) * (iy1 - iy0))
        : edgeMean;

    // Bright plate preference (white / light yellow)
    var bright = mean > 140 ? 1 : mean > 110 ? 0.7 : mean > 80 ? 0.35 : 0.1;

    // Contrast: std proxy via edge energy
    var contrast = clamp(edgeMean / 80, 0, 1.5);

    // Size preference: not tiny, not almost whole frame unless clearly plate-like
    var frac = area / (w * h);
    var sizeScore =
      frac > 0.55 ? 0.35 : frac > 0.02 && frac < 0.45 ? 1 : frac >= 0.45 ? 0.6 : 0.2;

    var borderBonus = borderEdge > interiorEdge * 0.85 ? 1 : 0.55;
    var glyphBonus = interiorEdge > 12 ? 1 : interiorEdge > 6 ? 0.7 : 0.3;

    var score =
      aspectScore * 1.2 +
      bright * 0.9 +
      contrast * 0.8 +
      sizeScore * 0.7 +
      borderBonus * 0.6 +
      glyphBonus * 0.7;

    return {
      x: x0,
      y: y0,
      w: bw,
      h: bh,
      score: score,
      mean: mean,
      edgeMean: edgeMean,
    };
  }

  function nms(cands, iouThresh) {
    cands.sort(function (a, b) {
      return b.score - a.score;
    });
    var kept = [];
    for (var i = 0; i < cands.length; i++) {
      var a = cands[i];
      var ok = true;
      for (var j = 0; j < kept.length; j++) {
        var b = kept[j];
        var x0 = Math.max(a.x, b.x);
        var y0 = Math.max(a.y, b.y);
        var x1 = Math.min(a.x + a.w, b.x + b.w);
        var y1 = Math.min(a.y + a.h, b.y + b.h);
        var inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
        var uni = a.w * a.h + b.w * b.h - inter;
        if (uni > 0 && inter / uni > iouThresh) {
          ok = false;
          break;
        }
      }
      if (ok) kept.push(a);
    }
    return kept;
  }

  function detectByWindows(gray, edges, w, h) {
    var iiGray = integral(gray, w, h);
    var iiEdge = integral(edges, w, h);
    var cands = [];
    var aspects = [1.2, 1.5, 1.8, 2.2, 3.0, 3.8, 4.5];
    var heights = [];
    for (var hh = Math.max(14, Math.floor(h * 0.04)); hh <= Math.floor(h * 0.55); hh += Math.max(2, Math.floor(h * 0.02))) {
      heights.push(hh);
    }
    var step = Math.max(2, Math.floor(Math.min(w, h) * 0.03));
    for (var ai = 0; ai < aspects.length; ai++) {
      var aspect = aspects[ai];
      for (var hi = 0; hi < heights.length; hi++) {
        var bh = heights[hi];
        var bw = Math.round(bh * aspect);
        if (bw >= w - 4) continue;
        for (var y = 2; y + bh < h - 2; y += step) {
          for (var x = 2; x + bw < w - 2; x += step) {
            var s = scoreWindow(gray, edges, iiGray, iiEdge, w, h, x, y, bw, bh);
            if (s && s.score > 3.2) cands.push(s);
          }
        }
      }
    }
    return nms(cands, 0.35);
  }

  function detectBrightBlob(gray, edges, w, h) {
    // Threshold bright pixels, find largest bright connected-ish bbox via row/col projection
    var sorted = Array.prototype.slice.call(gray).sort(function (a, b) {
      return a - b;
    });
    var thr = sorted[Math.floor(sorted.length * 0.72)];
    thr = Math.max(thr, 120);
    var mask = new Uint8Array(w * h);
    for (var i = 0; i < gray.length; i++) {
      mask[i] = gray[i] >= thr && edges[i] > 8 ? 1 : gray[i] >= thr + 25 ? 1 : 0;
    }
    // Morphological close (dilate then erode) lightly via neighbor vote
    var closed = new Uint8Array(w * h);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var idx = y * w + x;
        var n =
          mask[idx] +
          mask[idx - 1] +
          mask[idx + 1] +
          mask[idx - w] +
          mask[idx + w];
        closed[idx] = n >= 2 ? 1 : 0;
      }
    }

    // Connected components (4-conn) — keep largest components with plate-like aspect
    var seen = new Uint8Array(w * h);
    var best = null;
    var stack = new Int32Array(w * h);
    for (var sy = 1; sy < h - 1; sy++) {
      for (var sx = 1; sx < w - 1; sx++) {
        var start = sy * w + sx;
        if (!closed[start] || seen[start]) continue;
        var top = 0;
        stack[top++] = start;
        seen[start] = 1;
        var minX = sx,
          maxX = sx,
          minY = sy,
          maxY = sy,
          count = 0;
        while (top) {
          var p = stack[--top];
          var px = p % w;
          var py = (p / w) | 0;
          count++;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
          var neigh = [p - 1, p + 1, p - w, p + w];
          for (var k = 0; k < 4; k++) {
            var q = neigh[k];
            if (q < 0 || q >= w * h || seen[q] || !closed[q]) continue;
            seen[q] = 1;
            stack[top++] = q;
          }
        }
        var bw = maxX - minX + 1;
        var bh = maxY - minY + 1;
        var aspect = bw / bh;
        var frac = (bw * bh) / (w * h);
        if (count < 60) continue;
        if (aspect < 0.8 || aspect > 5.8) continue;
        if (frac < 0.01 || frac > 0.7) continue;
        var fill = count / (bw * bh);
        if (fill < 0.25) continue;
        var score =
          fill * 1.4 +
          (aspect >= 1 && aspect <= 5 ? 1.2 : 0.4) +
          (frac > 0.03 && frac < 0.4 ? 1 : 0.4) +
          Math.min(1.5, count / 800);
        if (!best || score > best.score) {
          best = { x: minX, y: minY, w: bw, h: bh, score: score + 0.5, method: "bright_blob" };
        }
      }
    }
    return best;
  }

  function expandBox(box, w, h, padFrac) {
    var padX = Math.round(box.w * padFrac);
    var padY = Math.round(box.h * padFrac);
    var x = clamp(box.x - padX, 0, w - 1);
    var y = clamp(box.y - padY, 0, h - 1);
    var x2 = clamp(box.x + box.w + padX, 1, w);
    var y2 = clamp(box.y + box.h + padY, 1, h);
    return {
      x: x,
      y: y,
      w: x2 - x,
      h: y2 - y,
      score: box.score,
      method: box.method,
      mean: box.mean,
      edgeMean: box.edgeMean,
    };
  }

  function mapToSource(box, scale, sw, sh) {
    var x = clamp(Math.floor(box.x / scale), 0, sw - 1);
    var y = clamp(Math.floor(box.y / scale), 0, sh - 1);
    var x2 = clamp(Math.ceil((box.x + box.w) / scale), 1, sw);
    var y2 = clamp(Math.ceil((box.y + box.h) / scale), 1, sh);
    return { x: x, y: y, w: x2 - x, h: y2 - y };
  }

  function isLikelyTightCrop(w, h, best) {
    if (!best) return true;
    var frac = (best.w * best.h) / (w * h);
    // If best ROI is weak or covers most of frame, treat as already-cropped plate
    return best.score < 3.6 || frac > 0.72;
  }

  /**
   * @param {HTMLCanvasElement} srcCanvas
   * @returns {{x:number,y:number,w:number,h:number,conf:number,method:string}}
   */
  function detectPlateRoi(srcCanvas) {
    var sw = srcCanvas.width;
    var sh = srcCanvas.height;
    if (!sw || !sh) {
      return { x: 0, y: 0, w: sw || 1, h: sh || 1, conf: 0.1, method: "empty" };
    }

    var ds = downsample(srcCanvas, 420);
    var img = ds.ctx.getImageData(0, 0, ds.w, ds.h);
    var gray = toGray(img.data, ds.w, ds.h);
    var edges = sobelMag(gray, ds.w, ds.h);

    var blob = detectBrightBlob(gray, edges, ds.w, ds.h);
    var windows = detectByWindows(gray, edges, ds.w, ds.h);
    var winBest = windows[0] || null;

    var best = null;
    if (blob && winBest) {
      best = blob.score >= winBest.score - 0.3 ? blob : Object.assign({ method: "edge_window" }, winBest);
    } else if (blob) {
      best = blob;
    } else if (winBest) {
      best = Object.assign({ method: "edge_window" }, winBest);
    }

    if (!best || isLikelyTightCrop(ds.w, ds.h, best)) {
      // Full-frame / already cropped plate
      return {
        x: 0,
        y: 0,
        w: sw,
        h: sh,
        conf: best ? clamp(best.score / 6, 0.35, 0.7) : 0.4,
        method: "full_frame_fallback",
      };
    }

    best = expandBox(best, ds.w, ds.h, 0.06);
    var mapped = mapToSource(best, ds.scale, sw, sh);
    // Ensure minimum OCR-friendly size
    if (mapped.w < 40 || mapped.h < 16) {
      return { x: 0, y: 0, w: sw, h: sh, conf: 0.35, method: "full_frame_fallback" };
    }
    return {
      x: mapped.x,
      y: mapped.y,
      w: mapped.w,
      h: mapped.h,
      conf: clamp(best.score / 6.5, 0.45, 0.98),
      method: best.method || "edge_window",
    };
  }

  function sliceRoi(srcCanvas, roi, topSkipFrac, padFrac) {
    var sx = roi.x;
    var sy = roi.y;
    var sw = roi.w;
    var sh = roi.h;
    var padY = Math.floor(sh * padFrac);
    var padX = Math.floor(sw * padFrac);
    var topSkip = Math.floor(sh * topSkipFrac);
    var cx = sx + padX;
    var cy = sy + Math.max(padY, topSkip);
    var cw = Math.max(1, sw - 2 * padX);
    var ch = Math.max(1, sh - (cy - sy) - padY);
    var tmp = document.createElement("canvas");
    tmp.width = cw;
    tmp.height = ch;
    tmp.getContext("2d").drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return tmp;
  }

  function upscaleCanvas(src, scale, smooth) {
    var out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(src.width * scale));
    out.height = Math.max(1, Math.round(src.height * scale));
    var octx = out.getContext("2d");
    octx.imageSmoothingEnabled = !!smooth;
    if (smooth) octx.imageSmoothingQuality = "high";
    octx.drawImage(src, 0, 0, out.width, out.height);
    return out;
  }

  function toGrayCanvas(src) {
    var c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    var ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    var id = ctx.getImageData(0, 0, c.width, c.height);
    var d = id.data;
    for (var p = 0; p < d.length; p += 4) {
      var g = (0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]) | 0;
      d[p] = d[p + 1] = d[p + 2] = g;
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  /**
   * Build OCR-ready crop variants. Aggressive hist-eq can destroy synthetic/clean plates;
   * prefer raw + light upscale, with optional header skip for VN moto plates.
   * @returns {HTMLCanvasElement[]}
   */
  function preprocessPlateCropVariants(srcCanvas, roi) {
    var raw = sliceRoi(srcCanvas, roi, 0, 0.02);
    var noHeader = sliceRoi(srcCanvas, roi, 0.18, 0.03);
    var variants = [
      upscaleCanvas(raw, 2, false),
      upscaleCanvas(noHeader, 2.5, false),
      upscaleCanvas(toGrayCanvas(noHeader), 3, false),
      upscaleCanvas(raw, 2, true),
    ];
    return variants;
  }

  /** @returns {HTMLCanvasElement} primary crop (compat) */
  function preprocessPlateCrop(srcCanvas, roi) {
    return preprocessPlateCropVariants(srcCanvas, roi)[1];
  }

  function drawRoiOverlay(ctx, roi, label) {
    if (!ctx || !roi) return;
    var lw = Math.max(2, Math.round(Math.min(ctx.canvas.width, ctx.canvas.height) / 180));
    ctx.save();
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = lw;
    ctx.strokeRect(roi.x + lw / 2, roi.y + lw / 2, roi.w - lw, roi.h - lw);
    var text = label || "plate ROI";
    ctx.font = Math.max(14, Math.round(ctx.canvas.width / 40)) + "px sans-serif";
    ctx.fillStyle = "rgba(11,18,32,0.75)";
    var tw = ctx.measureText(text).width + 10;
    var th = Math.max(18, Math.round(ctx.canvas.width / 36));
    var ty = Math.max(th + 4, roi.y - 4);
    ctx.fillRect(roi.x, ty - th, tw, th);
    ctx.fillStyle = "#22d3ee";
    ctx.fillText(text, roi.x + 5, ty - 5);
    ctx.restore();
  }

  global.PlatesRoi = {
    detectPlateRoi: detectPlateRoi,
    preprocessPlateCrop: preprocessPlateCrop,
    preprocessPlateCropVariants: preprocessPlateCropVariants,
    drawRoiOverlay: drawRoiOverlay,
  };
})(typeof window !== "undefined" ? window : globalThis);
