(function (global) {
  'use strict';

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const LAB_EPS = 216 / 24389;
  const LAB_KAPPA = 24389 / 27;

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
  }

  function rgbToHex(r, g, b) {
    const rr = Math.round(clamp01(r) * 255);
    const gg = Math.round(clamp01(g) * 255);
    const bb = Math.round(clamp01(b) * 255);
    return '#' + [rr, gg, bb].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  function hslToRgb(h, s, l) {
    const hDeg = (((h % 360) + 360) % 360);
    const hh = hDeg / 360;
    const ss = s / 100;
    const ll = l / 100;
    if (ss === 0) return [ll, ll, ll];
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    const f = (t) => {
      if (t < 0) t += 1; else if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)];
  }

  function toLinear(c) {
    c = clamp01(c);
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function toSrgb(c) {
    c = clamp01(c);
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }

  function rgbToLab(r, g, b) {
    const rr = toLinear(r), gg = toLinear(g), bb = toLinear(b);
    const x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
    const y = rr * 0.2126729 + gg * 0.7151522 + bb * 0.072175;
    const z = (rr * 0.0193339 + gg * 0.119192 + bb * 0.9503041) / 1.08883;
    const f = (t) => (t > LAB_EPS ? Math.pow(t, 1 / 3) : (841 / 108) * t + 4 / 29);
    const fx = f(x), fy = f(y), fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function hexToLab(hex) {
    const [r, g, b] = hexToRgb(hex);
    return rgbToLab(r / 255, g / 255, b / 255);
  }

  function labToLinear(L, a, b) {
    const fy = (L + 16) / 116;
    const fx = fy + a / 500, fz = fy - b / 200;
    const finv = (t) => { const t3 = Math.pow(t, 3); return t3 > LAB_EPS ? t3 : (116 * t - 16) / LAB_KAPPA; };
    const x = finv(fx) * 0.95047, y = finv(fy), z = finv(fz) * 1.08883;
    return [x * 3.2404542 + y * -1.5371385 + z * -0.4985314, x * -0.969266 + y * 1.8760108 + z * 0.041556, x * 0.0556434 + y * -0.2040259 + z * 1.0572252];
  }

  function labToRgb(L, aStar, bStar) {
    const chroma0 = Math.sqrt(aStar * aStar + bStar * bStar);
    const hAng = Math.atan2(bStar, aStar);
    const fits = (c) => labToLinear(L, c * Math.cos(hAng), c * Math.sin(hAng)).every(v => v >= -1e-9 && v <= 1 + 1e-9);
    let chroma = chroma0;
    if (chroma0 > 0 && !fits(chroma0)) {
      let lo = 0, hi = chroma0;
      for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
      chroma = lo;
    }
    const [r, g, b] = labToLinear(L, chroma * Math.cos(hAng), chroma * Math.sin(hAng));
    return [clamp01(toSrgb(r)), clamp01(toSrgb(g)), clamp01(toSrgb(b))];
  }

  function labToHex(L, a, b) {
    const [r, g, b2] = labToRgb(L, a, b);
    return rgbToHex(r, g, b2);
  }

  function generateHslSpindle(n) {
    const half = Math.ceil(n / 2);
    const warmHues = [];
    const coolHues = [];

    // Warm range: 330 to 150 degrees
    for (let i = 0; i < half; i++) {
      warmHues.push((330 + (i / half) * 180) % 360);
    }
    // Cool range: 150 to 330 degrees
    for (let i = 0; i < n - half; i++) {
      coolHues.push(150 + (i / (n - half)) * 180);
    }

    // Strictly interleave warm and cool 1-to-1
    const hues = [];
    for (let i = 0; i < Math.max(warmHues.length, coolHues.length); i++) {
      if (i < warmHues.length) hues.push(warmHues[i]);
      if (i < coolHues.length) hues.push(coolHues[i]);
    }

    const denom = n + 2;
    const Ls = [];
    for (let k = 1; k <= n; k++) {
      const val = k / denom;
      let l = val <= 0.5 ? 0.5 * Math.pow(2 * val, 1 / 3) : 1 - 0.5 * Math.pow(2 * (1 - val), 1 / 3);
      Ls.push(l * 100);
    }

    const Ts = [];
    for (let t = 1; t <= n; t++) Ts.push((t * 100) / denom);

    const colors = [];
    for (let j = 0; j < n; j++) {
      const h = hues[j];
      const l = Ls[j];
      const t = Ts[j];
      const Lval = l / 100;
      const sMax = (1 - 2 * Math.abs(Lval - 0.5)) * 100;
      let s = sMax * Math.pow((t / 100), 0.5);
      s = Math.max(0, Math.min(100, s));
      const rgb = hslToRgb(h, s, l);
      const lab = rgbToLab(rgb[0], rgb[1], rgb[2]);
      colors.push({ h, s, l, hexOrig: rgbToHex(rgb[0], rgb[1], rgb[2]), LOrig: lab[0], a: lab[1], b: lab[2] });
    }
    return colors;
  }

  function adjustColors(n) {
    const generated = generateHslSpindle(n);
    const half = Math.floor(n / 2);

    // Split into lower half (0 to 50) and upper half (50 to 100) relative to neutral grey
    const lowerColors = generated.slice(0, half);
    const upperColors = generated.slice(half);

    lowerColors.forEach((c, i) => {
      c.targetL = ((i + 1) / (lowerColors.length + 1)) * 50;
    });

    upperColors.forEach((c, i) => {
      c.targetL = 50 + ((i + 1) / (upperColors.length + 1)) * 50;
    });

    // CIELAB L* adjustment step: apply targetL while preserving original a*, b* (hue/chromaticity)
    const adjustedResults = generated.map(g => {
      const adjustedHex = labToHex(g.targetL, g.a, g.b);
      const adjustedLab = hexToLab(adjustedHex);
      return {
        ...g,
        adjustedHex: adjustedHex,
        LAdjusted: adjustedLab[0]
      };
    });

    const fullSet = [
      { type: 'black', hex: '#000000', L: 0, a: 0, b: 0, targetL: 0, adjustedHex: '#000000', LAdjusted: 0 },
      { type: 'grey', hex: '#808080', L: 50, a: 0, b: 0, targetL: 50, adjustedHex: '#808080', LAdjusted: 50 },
      { type: 'white', hex: '#FFFFFF', L: 100, a: 0, b: 0, targetL: 100, adjustedHex: '#FFFFFF', LAdjusted: 100 },
      ...adjustedResults.map(c => ({ type: 'color', hex: c.adjustedHex, L: c.targetL, a: c.a, b: c.b, original: c }))
    ];

    const ranked = fullSet.slice().sort((a, b) => a.targetL - b.targetL);

    return { adjustedColors: adjustedResults, fullRanked: ranked };
  }

  function renderCircle(container, adjustedColors, n) {
    if (!container || !container.style) return;
    const sliceAngle = 360 / n;
    let gradient = 'conic-gradient(from -90deg, ';
    adjustedColors.forEach((c, i) => {
      const color = c.adjustedHex || c.hexOrig;
      const start = i * sliceAngle;
      const end = (i + 1) * sliceAngle;
      if (i > 0) gradient += ', ';
      gradient += color + ' ' + start + 'deg ' + end + 'deg';
    });
    gradient += ')';
    container.style.background = gradient;
  }

  function renderSwatches(container, adjustedColors) {
    if (!container) return;
    container.innerHTML = '';
    adjustedColors.slice().sort((a, b) => (a.targetL || 0) - (b.targetL || 0)).forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      const box = document.createElement('div');
      box.className = 'swatch-box';
      box.style.background = c.adjustedHex || c.hexOrig;
      const label = document.createElement('div');
      label.className = 'swatch-label';
      label.textContent = c.adjustedHex || c.hexOrig;
      swatch.appendChild(box); swatch.appendChild(label);
      if (container.appendChild) container.appendChild(swatch);
    });
  }

  function renderTable(tbody, adjustedColors, fullRanked) {
    if (!tbody) return;
    tbody.innerHTML = '';
    adjustedColors.slice().sort((a, b) => (a.targetL || 0) - (b.targetL || 0)).forEach(c => {
      const tr = document.createElement('tr');
      const hex = c.adjustedHex || c.hexOrig;
      tr.innerHTML = '<td>-</td><td>' + (c.h || 0).toFixed(2) + '</td><td>' + (c.s || 0).toFixed(2) + '</td><td>' + (c.l || 0).toFixed(2) + '</td><td>' + (c.hexOrig || hex) + '</td><td>' + (c.LOrig || 0).toFixed(2) + '</td><td>' + (c.targetL ? c.targetL.toFixed(2) : '-') + '</td><td>' + hex + '</td><td>' + (c.LAdjusted ? c.LAdjusted.toFixed(2) : '-') + '</td><td><div style="width:30px;height:20px;background:' + hex + ';border:1px solid var(--line);border-radius:3px;"></div></td>';
      if (tbody.appendChild) tbody.appendChild(tr);
    });
    fullRanked.forEach(x => {
      if (x.type === 'black' || x.type === 'grey' || x.type === 'white') {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + x.type + '</td><td>-</td><td>-</td><td>-</td><td>' + x.hex + '</td><td>' + (x.L || 0).toFixed(2) + '</td><td>' + (x.L || 0).toFixed(2) + '</td><td>' + x.hex + '</td><td>' + (x.L || 0).toFixed(2) + '</td><td><div style="width:30px;height:20px;background:' + x.hex + ';border:1px solid var(--line);border-radius:3px;"></div></td>';
        if (tbody.appendChild) tbody.appendChild(tr);
      }
    });
  }

  function generate() {
    const nInput = document.getElementById('numColors');
    const n = parseInt(nInput ? nInput.value : '12') || 12;
    if (n < 1) return;
    const result = adjustColors(n);
    renderCircle(document.getElementById('colorCircle'), result.adjustedColors, n);
    renderSwatches(document.getElementById('swatches'), result.adjustedColors);
    renderTable(document.querySelector('#colorTable tbody'), result.adjustedColors, result.fullRanked);
  }

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.getElementById('generateBtn');
      if (btn && btn.addEventListener) btn.addEventListener('click', generate);
      generate();
    });
  } else if (typeof global.addEventListener === 'function') {
    global.addEventListener('load', generate);
  }
})(window);
