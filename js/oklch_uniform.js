(function (global) {
  'use strict';

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const LAB_EPS = 216 / 24389;
  const LAB_KAPPA = 24389 / 27;

  function rgbToHex(r, g, b) {
    const rr = Math.round(clamp01(r) * 255);
    const gg = Math.round(clamp01(g) * 255);
    const bb = Math.round(clamp01(b) * 255);
    return '#' + [rr, gg, bb].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
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

  function oklchToOklab(L, C, h) {
    const rad = h * Math.PI / 180;
    return [L, C * Math.cos(rad), C * Math.sin(rad)];
  }

  function oklabToXyz(L, a, b) {
    const l1 = L + 0.3963377774 * a + 0.2158037573 * b;
    const m1 = L + -0.1055613458 * a + -0.0638541728 * b;
    const s1 = L + -0.0894841775 * a + -1.2914855480 * b;
    const l = l1 * l1 * l1;
    const m = m1 * m1 * m1;
    const s = s1 * s1 * s1;
    const x = 1.2270138511 * l + -0.5577999807 * m + 0.2812561490 * s;
    const y = -0.0405801784 * l + 1.1122568696 * m + -0.0716766787 * s;
    const z = -0.0763812845 * l + -0.4214819784 * m + 1.5861632204 * s;
    return [x, y, z];
  }

  function xyzToSrgbLinear(x, y, z) {
    const r =  3.2404542 * x + -1.5371385 * y + -0.4985314 * z;
    const g = -0.9692660 * x +  1.8760108 * y +  0.0415560 * z;
    const b =  0.0556434 * x + -0.2040259 * y +  1.0572252 * z;
    return [r, g, b];
  }

  function oklabToRgb(L, a, b) {
    const [x, y, z] = oklabToXyz(L, a, b);
    const [rl, gl, bl] = xyzToSrgbLinear(x, y, z);
    return [toSrgb(rl), toSrgb(gl), toSrgb(bl)];
  }

  function hexToOklch(hex) {
    const [r, g, b] = hexToRgb(hex);
    const lr = toLinear(r / 255), lg = toLinear(g / 255), lb = toLinear(b / 255);
    const x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
    const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
    const z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041;
    const l_ = 0.8189330101 * x + 0.3618667424 * y + -0.1288597137 * z;
    const m_ = 0.0329845436 * x + 0.9293118715 * y +  0.0361456387 * z;
    const s_ = 0.0482003018 * x + 0.2643662691 * y +  0.6338517070 * z;
    const l = Math.cbrt(l_), m = Math.cbrt(m_), s = Math.cbrt(s_);
    const okL = 0.2104542553 * l + 0.7936177850 * m + -0.0040720468 * s;
    const oka = 1.9779984951 * l + -2.4285922050 * m +  0.4505937099 * s;
    const okb = 0.0259040371 * l +  0.7827717662 * m + -0.8086757660 * s;
    const c = Math.sqrt(oka * oka + okb * okb);
    const h = Math.atan2(okb, oka) * 180 / Math.PI;
    return [okL, c, ((h % 360) + 360) % 360];
  }

  function sampleOklchStratified(n) {
    const colors = [];
    const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

    for (let i = 0; i < n; i++) {
      const lchH = (i * GOLDEN_RATIO_CONJUGATE * 360) % 360;
      const lchL = 0.5;
      let lchC = 0.18;

      let [okL, a, b] = oklchToOklab(lchL, lchC, lchH);
      let rgbv = oklabToRgb(okL, a, b);

      if (!rgbv.every(v => v >= 0 && v <= 1)) {
        let lo = 0, hi = lchC;
        for (let step = 0; step < 30; step++) {
          const mid = (lo + hi) / 2;
          const [tL, ta, tb] = oklchToOklab(lchL, mid, lchH);
          const trgb = oklabToRgb(tL, ta, tb);
          if (trgb.every(v => v >= 0 && v <= 1)) lo = mid;
          else hi = mid;
        }
        lchC = lo;
        [okL, a, b] = oklchToOklab(lchL, lchC, lchH);
      }

      const hexOrig = rgbToHex(...oklabToRgb(okL, a, b));
      const labOrig = hexToLab(hexOrig);
      colors.push({ lchH, lchC, hexOrig, LOrig: labOrig[0], a: labOrig[1], b: labOrig[2] });
    }
    return colors;
  }

  function adjustByLuminance(n) {
    const generated = sampleOklchStratified(n);

    // Flipped starting logic: Index 0 starts bright/high lightness, alternating down first
    generated.forEach((c, i) => {
      if (i % 2 === 0) {
        c.targetLStar = 25 + ((n - i - 1) / n) * 20; // Starts higher / lighter variant
      } else {
        c.targetLStar = 85 - (i / n) * 20; // Starts lower / darker variant
      }
    });

    const adjustedResults = generated.map(g => {
      const adjustedHex = labToHex(g.targetLStar, g.a, g.b);
      const adjustedLab = hexToLab(adjustedHex);
      return {
        ...g,
        adjustedHex,
        LAdjusted: adjustedLab[0]
      };
    });

    const fullSet = [
      { type: 'black', hex: '#000000', targetLStar: 0, adjustedHex: '#000000', LAdjusted: 0, a: 0, b: 0 },
      { type: 'grey', hex: '#808080', targetLStar: 50, adjustedHex: '#808080', LAdjusted: 50, a: 0, b: 0 },
      { type: 'white', hex: '#FFFFFF', targetLStar: 100, adjustedHex: '#FFFFFF', LAdjusted: 100, a: 0, b: 0 },
      ...adjustedResults.map(c => ({ type: 'color', hex: c.adjustedHex, targetLStar: c.targetLStar, adjustedHex: c.adjustedHex, LAdjusted: c.LAdjusted, original: c }))
    ];

    const ranked = fullSet.slice().sort((a, b) => a.targetLStar - b.targetLStar);

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
    adjustedColors.slice().sort((a, b) => (a.targetLStar || 0) - (b.targetLStar || 0)).forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      const box = document.createElement('div');
      box.className = 'swatch-box';
      box.style.background = c.adjustedHex || c.hexOrig;
      const label = document.createElement('div');
      label.className = 'swatch-label';
      label.textContent = c.adjustedHex || c.hexOrig;
      swatch.appendChild(box); 
      swatch.appendChild(label);
      container.appendChild(swatch);
    });
  }

  function renderTable(tbody, adjustedColors, fullRanked) {
    if (!tbody) return;
    tbody.innerHTML = '';
    fullRanked.forEach((item, index) => {
      const tr = document.createElement('tr');
      const displayColor = item.adjustedHex || item.hex;
      const lab = hexToLab(displayColor);
      const [l, c, h] = hexToOklch(displayColor);
      const lchStr = `${l.toFixed(3)}, ${c.toFixed(3)}, ${h.toFixed(1)}°`;
      const labStr = `${lab[0].toFixed(1)}, ${lab[1].toFixed(1)}, ${lab[2].toFixed(1)}`;
      const hexOrig = item.original ? item.original.hexOrig : item.hex;
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${hexOrig}</td>
        <td>${lchStr}</td>
        <td>${displayColor}</td>
        <td>${labStr}</td>
        <td><div style="width: 30px; height: 20px; background: ${displayColor}; border-radius: 3px; border: 1px solid rgba(0,0,0,0.1);"></div></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function init() {
    const numColorsInput = document.getElementById('numColors');
    const generateBtn = document.getElementById('generateBtn');
    const colorCircle = document.getElementById('colorCircle');
    const swatchesContainer = document.getElementById('swatches');
    const colorTableBody = document.querySelector('#colorTable tbody');
    
    function generate() {
      const n = parseInt(numColorsInput.value, 10) || 12;
      const { adjustedColors, fullRanked } = adjustByLuminance(n);
      renderCircle(colorCircle, adjustedColors, n);
      renderSwatches(swatchesContainer, adjustedColors);
      renderTable(colorTableBody, adjustedColors, fullRanked);
    }

    if (generateBtn) generateBtn.addEventListener('click', generate);
    if (numColorsInput) {
      numColorsInput.addEventListener('change', generate);
      numColorsInput.addEventListener('input', generate);
    }
    generate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);