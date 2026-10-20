/* Canvas port of PIL draw_smiley() from tools/generate_smileys.py.
   Triplet colours are CSS #RRGGBB strings (grayscale sets included).

   Two PIL conventions are mirrored deliberately so exported PNGs and the web
   app stay pixel-compatible:
   - PIL draws `outline=..., width=n` INWARD from the shape boundary, while
     canvas centres the stroke — so we stroke a path shrunk by n/2.
   - PIL uses integer division for the eye radius (size // 12). */
(function (global) {
  'use strict';

  const BASE_SIZE = 150; // reference size of the Python template

  function strokeStyle(ctx, s) {
    const stroke = Math.max(1, 4 * s);
    ctx.lineWidth = stroke;
    return stroke;
  }

  /** Border ring, eyes and mouth — shared by the triplet and overview faces. */
  function drawFeatures(ctx, ringColor, featureColor, size) {
    const s = size / BASE_SIZE;
    const half = strokeStyle(ctx, s) / 2;
    const eyeR = Math.max(1, Math.floor(size / 12));
    const cx = size / 2;
    const cy = size / 2;

    // Outer border circle (PIL bbox [10,10,size-10,size-10], width 4)
    ctx.strokeStyle = ringColor;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 10 * s - half, 0, Math.PI * 2);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = featureColor;
    for (const ex of [0.32 * size, 0.68 * size]) {
      ctx.beginPath();
      ctx.ellipse(ex, 0.35 * size, eyeR, eyeR, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth — bottom half of the ellipse (PIL arc start=0, end=180)
    ctx.strokeStyle = featureColor;
    ctx.beginPath();
    ctx.ellipse(0.5 * size, 0.6 * size, 0.25 * size - half, 0.15 * size - half, 0, 0, Math.PI);
    ctx.stroke();
  }

  /** Classic smiley: face colour as background, features in two other colours. */
  function drawSmiley(ctx, triplet, size) {
    ctx.fillStyle = triplet.face;
    ctx.fillRect(0, 0, size, size);
    drawFeatures(ctx, triplet.outline, triplet.feature, size);
  }

  /**
   * Overview smiley: the whole palette in one image. The face is a pie slice
   * per colour (clockwise from 12 o'clock), border/eyes/mouth use the most
   * distinct palette colour, the corners the last one.
   */
  function drawOverview(ctx, item, size) {
    const s = size / BASE_SIZE;
    const colors = item.colors;
    const n = colors.length;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 10 * s;
    const start = -Math.PI / 2; // 12 o'clock

    ctx.fillStyle = colors[n - 1];
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start + (i * 2 * Math.PI) / n, start + ((i + 1) * 2 * Math.PI) / n);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
    }

    drawFeatures(ctx, item.contrast, item.contrast, size);
  }

  /**
   * Render a gallery item into a <canvas> element at a given CSS size,
   * handling devicePixelRatio for crisp output.
   */
  function render(canvas, item, cssSize) {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (item.kind === 'palette') {
      drawOverview(ctx, item, cssSize);
    } else {
      drawSmiley(ctx, item, cssSize);
    }
  }

  global.Smiley = { BASE_SIZE, drawSmiley, drawOverview, render };
})(window);
