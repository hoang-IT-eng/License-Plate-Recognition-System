(function (global) {
  "use strict";

  /**
   * Client-side Optical Plate ROI Detector for Azure F1 & Hugging Face Static Space.
   * Cascade:
   *  1) Connected bright high-contrast rectangular plate component with spatial bumper prior
   *  2) Integral-image + Sobel vertical/horizontal edge density sliding window + NMS
   *  3) Tight-crop full-frame fallback when input is already an isolated plate crop
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

  function integral(arr, w, h) {
    var ii = new Float64Array((w + 1) * (h + 1));
    for (var y = 1; y <= h; y++) {
      var row = 0;
      for (var x = 1; x <= w; x++) {
        row += arr[(y - 1) * w + (x - 1)];
        ii[y * (w + 1) + x] = ii[(y - 1) * (w + 1) + x] + row;
      }
    }
    return ii;
  }

  function rectSum(ii, w, x0, y0, x1, y1) {
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
        /* Vertical stroke emphasis for alphanumeric plate glyphs */
        mag[i] = Math.abs(gx) * 1.25 + Math.abs(gy) * 0.75;
      }
    }
    return mag;
  }

  function spatialPrior(x0, y0, bw, bh, w, h) {
    var cx = (x0 + bw * 0.5) / w;
    var cy = (y0 + bh * 0.5) / h;
    /* Plates very rarely sit in the top 18% sky band of street frames */
    if (cy < 0.16) return 0.35;
    var yBonus = cy >= 0.32 && cy <= 0.88 ? 1.15 : 0.82;
    var xBonus = cx >= 0.18 && cx <= 0.82 ? 1.1 : 0.85;
    return yBonus * xBonus;
  }

  function scoreWindow(gray, edges, iiGray, iiEdge, w, h, x0, y0, bw, bh) {
    var x1 = x0 + bw;
    var y1 = y0 + bh;
    if (x0 < 1 || y0 < 1 || x1 >= w - 1 || y1 >= h - 1) return null;
    var area = bw * bh;
    if (area < 90) return null;

    var aspect = bw / bh;
    var aspectScore = 0;
    if (aspect >= 1.1 && aspect <= 2.5) aspectScore = 1.02; /* VN 2-line moto/truck */
    else if (aspect > 2.5 && aspect <= 5.4) aspectScore = 1.05; /* VN 1-line car */
    else if (aspect >= 0.85 && aspect < 1.1) aspectScore = 0.55;
    else return null;

    var mean = rectSum(iiGray, w, x0, y0, x1, y1) / area;
    var edgeMean = rectSum(iiEdge, w, x0, y0, x1, y1) / area;

    var pad = Math.max(1, Math.floor(Math.min(bw, bh) * 0.12));
    var ix0 = x0 + pad;
    var iy0 = y0 + pad;
    var ix1 = x1 - pad;
    var iy1 = y1 - pad;
    var innerArea = Math.max(1, (ix1 - ix0) * (iy1 - iy0));
    var interiorEdge =
      ix1 > ix0 && iy1 > iy0
        ? rectSum(iiEdge, w, ix0, iy0, ix1, iy1) / innerArea
        : edgeMean;

    var bright = mean > 145 ? 1.05 : mean > 115 ? 0.78 : mean > 85 ? 0.4 : 0.12;
    var contrast = clamp(interiorEdge / 85, 0, 1.55);

    var frac = area / (w * h);
    var sizeScore =
      frac > 0.5 ? 0.25 : frac >= 0.008 && frac <= 0.28 ? 1.08 : frac <= 0.45 ? 0.65 : 0.2;

    var prior = spatialPrior(x0, y0, bw, bh, w, h);

    var score =
      (aspectScore * 1.15 +
        bright * 1.05 +
        contrast * 1.1 +
        sizeScore * 0.8) *
      prior;

    return {
      x: x0,
      y: y0,
      w: bw,
      h: bh,
      score: score,
      mean: mean,
      edgeMean: edgeMean
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
    var aspects = [1.25, 1.45, 1.8, 2.4, 3.2, 4.0, 4.7];
    var heights = [];
    for (var hh = Math.max(12, Math.floor(h * 0.045)); hh <= Math.floor(h * 0.45); hh += Math.max(2, Math.floor(h * 0.022))) {
      heights.push(hh);
    }
    var step = Math.max(2, Math.floor(Math.min(w, h) * 0.026));
    for (var ai = 0; ai < aspects.length; ai++) {
      var aspect = aspects[ai];
      for (var hi = 0; hi < heights.length; hi++) {
        var bh = heights[hi];
        var bw = Math.round(bh * aspect);
        if (bw >= w - 4) continue;
        for (var y = 2; y + bh < h - 2; y += step) {
          for (var x = 2; x + bw < w - 2; x += step) {
            var s = scoreWindow(gray, edges, iiGray, iiEdge, w, h, x, y, bw, bh);
            if (s && s.score > 3.35) cands.push(s);
          }
        }
      }
    }
    return nms(cands, 0.35);
  }

  function detectBrightBlob(gray, edges, w, h) {
    var sorted = Array.prototype.slice.call(gray).sort(function (a, b) {
      return a - b;
    });
    var thr = Math.max(132, sorted[Math.floor(sorted.length * 0.78)]);
    var mask = new Uint8Array(w * h);
    for (var i = 0; i < gray.length; i++) {
      mask[i] = gray[i] >= thr ? 1 : 0;
    }
    var closed = new Uint8Array(w * h);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var idx = y * w + x;
        var n = mask[idx] + mask[idx - 1] + mask[idx + 1] + mask[idx - w] + mask[idx + w];
        closed[idx] = n >= 2 ? 1 : 0;
      }
    }

    var iiEdge = integral(edges, w, h);
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
        var minX = sx, maxX = sx, minY = sy, maxY = sy, count = 0;
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
        var area = bw * bh;
        var aspect = bw / bh;
        var frac = area / (w * h);
        if (count < 55 || aspect < 0.9 || aspect > 5.6) continue;
        if (frac < 0.005 || frac > 0.55) continue;
        var fill = count / area;
        if (fill < 0.28) continue;

        var edgeDensity = rectSum(iiEdge, w, minX, minY, maxX + 1, maxY + 1) / area;
        if (edgeDensity < 18) continue; /* Reject blank white walls/sky */

        var prior = spatialPrior(minX, minY, bw, bh, w, h);
        var score =
          (fill * 1.3 +
            (aspect >= 1.1 && aspect <= 5.0 ? 1.35 : 0.45) +
            clamp(edgeDensity / 75, 0, 1.7) +
            (frac >= 0.008 && frac <= 0.25 ? 1.1 : 0.45)) *
          prior;

        if (!best || score > best.score) {
          best = { x: minX, y: minY, w: bw, h: bh, score: score + 0.35, method: "bright_blob" };
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
      method: box.method
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
    var srcAspect = w / Math.max(1, h);
    if (frac > 0.72) return true;
    if (best.score < 3.45 && srcAspect >= 1.1 && srcAspect <= 5.2) return true;
    return false;
  }

  function detectPlateRoi(srcCanvas) {
    var sw = srcCanvas.width;
    var sh = srcCanvas.height;
    if (!sw || !sh) {
      return { x: 0, y: 0, w: sw || 1, h: sh || 1, conf: 0.1, method: "empty" };
    }

    var ds = downsample(srcCanvas, 440);
    var img = ds.ctx.getImageData(0, 0, ds.w, ds.h);
    var gray = toGray(img.data, ds.w, ds.h);
    var edges = sobelMag(gray, ds.w, ds.h);

    var blob = detectBrightBlob(gray, edges, ds.w, ds.h);
    var windows = detectByWindows(gray, edges, ds.w, ds.h);
    var winBest = windows[0] || null;

    var best = null;
    if (blob && winBest) {
      best = blob.score >= winBest.score - 0.25 ? blob : Object.assign({ method: "edge_window" }, winBest);
    } else if (blob) {
      best = blob;
    } else if (winBest) {
      best = Object.assign({ method: "edge_window" }, winBest);
    }

    if (!best || isLikelyTightCrop(ds.w, ds.h, best)) {
      return {
        x: 0,
        y: 0,
        w: sw,
        h: sh,
        conf: best ? clamp(best.score / 6.2, 0.45, 0.78) : 0.5,
        method: "tight_crop_frame"
      };
    }

    best = expandBox(best, ds.w, ds.h, 0.055);
    var mapped = mapToSource(best, ds.scale, sw, sh);
    if (mapped.w < 36 || mapped.h < 14) {
      return { x: 0, y: 0, w: sw, h: sh, conf: 0.4, method: "tight_crop_frame" };
    }
    return {
      x: mapped.x,
      y: mapped.y,
      w: mapped.w,
      h: mapped.h,
      conf: Number(clamp(best.score / 6.2, 0.58, 0.985).toFixed(4)),
      method: best.method || "edge_window"
    };
  }

  function sliceRoi(srcCanvas, roi, topSkipFrac, padFrac) {
    var sx = clamp(Math.round(roi.x), 0, Math.max(0, srcCanvas.width - 2));
    var sy = clamp(Math.round(roi.y), 0, Math.max(0, srcCanvas.height - 2));
    var sw = clamp(Math.round(roi.w), 2, srcCanvas.width - sx);
    var sh = clamp(Math.round(roi.h), 2, srcCanvas.height - sy);
    var padY = Math.floor(sh * padFrac);
    var padX = Math.floor(sw * padFrac);
    var topSkip = Math.floor(sh * topSkipFrac);
    var cx = sx + padX;
    var cy = sy + Math.max(padY, topSkip);
    var cw = Math.max(2, sw - 2 * padX);
    var ch = Math.max(2, sh - (cy - sy) - padY);
    var tmp = document.createElement("canvas");
    tmp.width = cw;
    tmp.height = ch;
    tmp.getContext("2d").drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return tmp;
  }

  function upscaleCanvas(src, scale, smooth) {
    var out = document.createElement("canvas");
    out.width = Math.max(2, Math.round(src.width * scale));
    out.height = Math.max(2, Math.round(src.height * scale));
    var octx = out.getContext("2d");
    octx.imageSmoothingEnabled = !!smooth;
    if (smooth) octx.imageSmoothingQuality = "high";
    octx.drawImage(src, 0, 0, out.width, out.height);
    return out;
  }

  function contrastStretchCanvas(src) {
    var c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    var ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    var id = ctx.getImageData(0, 0, c.width, c.height);
    var d = id.data;
    var minG = 255, maxG = 0;
    for (var i = 0; i < d.length; i += 4) {
      var g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
      if (g < minG) minG = g;
      if (g > maxG) maxG = g;
    }
    var span = Math.max(20, maxG - minG);
    for (var p = 0; p < d.length; p += 4) {
      var v = (0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]) | 0;
      var norm = clamp(Math.round(((v - minG) / span) * 255), 0, 255);
      d[p] = d[p + 1] = d[p + 2] = norm;
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  function preprocessPlateCropVariants(srcCanvas, roi) {
    var raw = sliceRoi(srcCanvas, roi, 0.0, 0.02);
    var trimmed = sliceRoi(srcCanvas, roi, 0.04, 0.04);
    var noHeader = sliceRoi(srcCanvas, roi, 0.16, 0.03);
    return [
      upscaleCanvas(contrastStretchCanvas(trimmed), 2.5, true),
      upscaleCanvas(raw, 2.2, true),
      upscaleCanvas(contrastStretchCanvas(noHeader), 2.6, false)
    ];
  }

  function preprocessPlateCrop(srcCanvas, roi) {
    return preprocessPlateCropVariants(srcCanvas, roi)[0];
  }

  function drawRoiOverlay(ctx, roi, label) {
    if (!ctx || !roi) return;
    var lw = Math.max(2, Math.round(Math.min(ctx.canvas.width, ctx.canvas.height) / 210));
    var corner = Math.max(10, Math.round(Math.min(roi.w, roi.h) * 0.24));
    ctx.save();
    /* Subtle translucent emerald scan box */
    ctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
    ctx.lineWidth = Math.max(1, lw - 1);
    ctx.strokeRect(roi.x, roi.y, roi.w, roi.h);

    /* Precision Leica/Anduril Corner Locks */
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = lw + 1;
    ctx.beginPath();
    /* TL */
    ctx.moveTo(roi.x, roi.y + corner); ctx.lineTo(roi.x, roi.y); ctx.lineTo(roi.x + corner, roi.y);
    /* TR */
    ctx.moveTo(roi.x + roi.w - corner, roi.y); ctx.lineTo(roi.x + roi.w, roi.y); ctx.lineTo(roi.x + roi.w, roi.y + corner);
    /* BR */
    ctx.moveTo(roi.x + roi.w, roi.y + roi.h - corner); ctx.lineTo(roi.x + roi.w, roi.y + roi.h); ctx.lineTo(roi.x + roi.w - corner, roi.y + roi.h);
    /* BL */
    ctx.moveTo(roi.x + corner, roi.y + roi.h); ctx.lineTo(roi.x, roi.y + roi.h); ctx.lineTo(roi.x, roi.y + roi.h - corner);
    ctx.stroke();

    var text = label || "OBB ROI";
    var fontPx = Math.max(13, Math.round(ctx.canvas.width / 46));
    ctx.font = "600 " + fontPx + "px JetBrains Mono, monospace";
    var tw = ctx.measureText(text).width + 14;
    var th = fontPx + 10;
    var ty = roi.y > th + 6 ? roi.y - 4 : roi.y + roi.h + th + 2;
    ctx.fillStyle = "rgba(9, 11, 14, 0.88)";
    ctx.fillRect(roi.x, ty - th, tw, th);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1;
    ctx.strokeRect(roi.x, ty - th, tw, th);
    ctx.fillStyle = "#10b981";
    ctx.fillText(text, roi.x + 7, ty - 6);
    ctx.restore();
  }

  global.PlatesRoi = {
    detectPlateRoi: detectPlateRoi,
    preprocessPlateCrop: preprocessPlateCrop,
    preprocessPlateCropVariants: preprocessPlateCropVariants,
    drawRoiOverlay: drawRoiOverlay
  };
})(typeof window !== "undefined" ? window : globalThis);
