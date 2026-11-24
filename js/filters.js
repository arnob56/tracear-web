(function () {
  "use strict";

  const MAX_DIMENSION = 1400;

  /**
   * Downsamples high-resolution photos once on import so Sobel edge filtering stays fast and low-memory on iPhone 12.
   */
  function normalizeSource(imageOrCanvas, maxDimension = MAX_DIMENSION) {
    const rawW = imageOrCanvas.naturalWidth || imageOrCanvas.width || 1;
    const rawH = imageOrCanvas.naturalHeight || imageOrCanvas.height || 1;
    const longest = Math.max(rawW, rawH);
    const scale = longest > maxDimension ? maxDimension / longest : 1;

    const targetW = Math.max(1, Math.round(rawW * scale));
    const targetH = Math.max(1, Math.round(rawH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(imageOrCanvas, 0, 0, targetW, targetH);
    return canvas;
  }

  /**
   * Applies Outline (Sobel edge alpha-matte), Grayscale, and Invert filters to targetCanvas.
   * Note: Opacity is intentionally NOT baked into pixels so the CSS GPU compositor handles slider updates at 60 fps.
   */
  function renderFiltered(sourceCanvas, targetCanvas, settings) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    if (targetCanvas.width !== w || targetCanvas.height !== h) {
      targetCanvas.width = w;
      targetCanvas.height = h;
    }

    const dstCtx = targetCanvas.getContext("2d");
    dstCtx.clearRect(0, 0, w, h);

    if (!settings.outline && !settings.grayscale && !settings.invert) {
      dstCtx.drawImage(sourceCanvas, 0, 0);
      return;
    }

    const srcCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    const srcImageData = srcCtx.getImageData(0, 0, w, h);
    const src = srcImageData.data;

    if (settings.outline) {
      const outImageData = dstCtx.createImageData(w, h);
      applyOutlineFilter(src, outImageData.data, w, h, Boolean(settings.invert));
      dstCtx.putImageData(outImageData, 0, 0);
      return;
    }

    // Tone pipeline (Grayscale and/or Invert)
    const outImageData = dstCtx.createImageData(w, h);
    const dst = outImageData.data;
    const doGray = Boolean(settings.grayscale);
    const doInvert = Boolean(settings.invert);

    for (let i = 0, len = src.length; i < len; i += 4) {
      let r = src[i];
      let g = src[i + 1];
      let b = src[i + 2];
      const a = src[i + 3];

      if (doGray) {
        const lum = (77 * r + 150 * g + 29 * b) >> 8;
        r = lum;
        g = lum;
        b = lum;
      }
      if (doInvert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      dst[i] = r;
      dst[i + 1] = g;
      dst[i + 2] = b;
      dst[i + 3] = a;
    }

    dstCtx.putImageData(outImageData, 0, 0);
  }

  function applyOutlineFilter(src, dst, w, h, invertLines) {
    const total = w * h;
    const lum = new Uint8Array(total);

    for (let p = 0, idx = 0; p < total; p++, idx += 4) {
      const alpha = src[idx + 3];
      // Blend translucent pixels over white before luminance extraction
      const invA = 255 - alpha;
      const r = (src[idx] * alpha + 255 * invA) >> 8;
      const g = (src[idx + 1] * alpha + 255 * invA) >> 8;
      const b = (src[idx + 2] * alpha + 255 * invA) >> 8;
      lum[p] = (77 * r + 150 * g + 29 * b) >> 8;
    }

    // Light 3x3 smoothing pass to suppress camera sensor grain
    const smooth = new Uint8Array(total);
    smooth.set(lum);
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const c = row + x;
        const sum =
          lum[c - w - 1] + (lum[c - w] << 1) + lum[c - w + 1] +
          (lum[c - 1] << 1) + (lum[c] << 2) + (lum[c + 1] << 1) +
          lum[c + w - 1] + (lum[c + w] << 1) + lum[c + w + 1];
        smooth[c] = sum >> 4;
      }
    }

    const strokeR = invertLines ? 255 : 14;
    const strokeG = invertLines ? 255 : 18;
    const strokeB = invertLines ? 255 : 26;

    // 3x3 Sobel operator -> transparent background where gradient is below noise floor
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const c = row + x;
        const tl = smooth[c - w - 1];
        const tc = smooth[c - w];
        const tr = smooth[c - w + 1];
        const ml = smooth[c - 1];
        const mr = smooth[c + 1];
        const bl = smooth[c + w - 1];
        const bc = smooth[c + w];
        const br = smooth[c + w + 1];

        const gx = -tl + tr - (ml << 1) + (mr << 1) - bl + br;
        const gy = -tl - (tc << 1) - tr + bl + (bc << 1) + br;
        const mag = (gx < 0 ? -gx : gx) + (gy < 0 ? -gy : gy);

        const outIdx = c << 2;
        if (mag <= 34) {
          dst[outIdx + 3] = 0;
        } else {
          const boosted = Math.min(255, ((mag - 34) * 9) >> 2);
          dst[outIdx] = strokeR;
          dst[outIdx + 1] = strokeG;
          dst[outIdx + 2] = strokeB;
          dst[outIdx + 3] = boosted;
        }
      }
    }
  }

  window.TraceARFilters = {
    normalizeSource: normalizeSource,
    renderFiltered: renderFiltered
  };
})();
