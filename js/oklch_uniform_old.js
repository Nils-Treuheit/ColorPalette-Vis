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

  function xyzToRgb(x, y, z) {
    const r =  3.2404542 * x + -1.5371385 * y + -0.4985314 * z;
    const g = -0.9692660 * x +  1.8760108 * y +  0.0415560 * z;
    const b =  0.0556434 * x + -0.2040259 * y +  1.0572252 * z;
    return [r, g, b];
  }

  function oklabToRgb(L, a, b) {
    const [x, y, z] = oklabToXyz(L, a, b);
    return xyzToRgb(x, y, z);
  }

  function oklabToOklch(L, a, b) {
    const c = Math.sqrt(a * a + b * b);
    const h = Math.atan2(b, a) * 180 / Math.PI;
    return [L, c, ((h % 360) + 360) % 360];
  }

  function sampleOklabUniform(n) {
    const colors = [];
    for (let i = 0; i < n; i++) {
      let r, g, bc, L, a, b;
      do {
        L = Math.random();
        a = (Math.random() * 0.509) - 0.233;
        b = (Math.random() * 0.630) - 0.311;
        const rgbv = oklabToRgb(L, a, b);
        r = rgbv[0]; g = rgbv[1]; bc = rgbv[2];
      } while (!(r >= 0 && r <= 1 && g >= 0 && g <= 1 && bc >= 0 && bc <= 1));
      const [lchL, lchC, lchH] = oklabToOklch(L, a, b);
      const hex = rgbToHex(r, g, bc);
      const lab = rgbToLab(r, g, bc);
      colors.push({ lchL, lchC, lchH, L, a, b, hex, labL: lab[0], laba: lab[1], labb: lab[2] });
    }
    return colors;
  }

  function adjustByLuminance(n) {
    const sampled = sampleOklabUniform(n);
    const denom = n + 2;
    const full = [
      { type: 'black', hex: '#000000', labL: 0, laba: 0, labb: 0, L: 0 },
      ...sampled.map(c => ({ type: 'color', hex: c.hex, labL: c.labL, laba: c.laba, labb: c.labb, orig: c })),
      { type: 'white', hex: '#FFFFFF', labL: 100, laba: 0, labb: 0, L: 1 }
    ];
    const ranked = full.slice().sort((a, b) => a.labL - b.labL);
    const adjusted = sampled.map(c => ({ ...c }));
    ranked.forEach((item, idx) => {
      if (item.type === 'color' && item.orig) {
        if (idx >= 1 && idx <= n) {
          const targetL = (idx * 100) / denom;
          const oc = item.orig;
          const adjHex = labToHex(targetL, oc.laba, oc.labb);
          const adjLab = hexToLab(adjHex);
          const resIdx = adjusted.findIndex(r => r.hex === oc.hex && Math.abs(r.labL - oc.labL) < 1e-9);
          if (resIdx !== -1 || adjusted.length === n) {
            const targetIdx = resIdx !== -1 ? resIdx : idx - 1;
            adjusted[targetIdx].hexAdj = adjHex;
            adjusted[targetIdx].labLAdj = adjLab[0];
            adjusted[targetIdx].labaAdj = adjLab[1];
            adjusted[targetIdx].labbAdj = adjLab[2];
            adjusted[targetIdx].targetL = targetL;
          }
        }
      }
    });
    return { adjusted, ranked };
  }

  function renderCircle(container, colors, n) {
    if (!container || !container.style) return;
    const sliceAngle = 360 / n;
    let gradient = 'conic-gradient(from -90deg, ';
    colors.forEach((c, i) => {
      const color = c.hexAdj || c.hex;
      const start = i * sliceAngle;
      const end = (i + 1) * sliceAngle;
      if (i > 0) gradient += ', ';
      gradient += color + ' ' + start + 'deg ' + end + 'deg';
    });
    gradient += ')';
    container.style.background = gradient;
  }

  function renderSwatches(container, colors) {
    if (!container) return;
    container.innerHTML = '';
    colors.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      const box = document.createElement('div');
      box.className = 'swatch-box';
      box.style.background = c.hexAdj || c.hex;
      const label = document.createElement('div');
      label.className = 'swatch-label';
      label.textContent = c.hexAdj || c.hex;
      swatch.appendChild(box);
      swatch.appendChild(label);
      if (container.appendChild) container.appendChild(swatch);
    });
  }

  function renderTable(tbody, colors, ranked) {
    if (!tbody) return;
    tbody.innerHTML = '';
    colors.forEach((c, i) => {
      const tr = document.createElement('tr');
      const hex = c.hexAdj || c.hex;
      const labL = c.labLAdj || c.labL;
      const laba = c.labaAdj || c.laba;
      const labb = c.labbAdj || c.labb;
      tr.innerHTML = '<td>' + i + '</td><td>' + hex + '</td><td>' + c.lchL.toFixed(4) + ', ' + c.lchC.toFixed(4) + ', ' + c.lchH.toFixed(2) + '</td><td>' + labL.toFixed(2) + '</td><td>' + laba.toFixed(2) + '</td><td>' + labb.toFixed(2) + '</td><td><div style="width:30px;height:20px;background:' + hex + ';border:1px solid var(--line);border-radius:3px;"></div></td>';
      if (tbody.appendChild) tbody.appendChild(tr);
    });
    if (ranked) {
      ranked.forEach(x => {
        if (x.type === 'black' || x.type === 'white') {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td>' + x.type + '</td><td>' + x.hex + '</td><td>-,-,-</td><td>' + x.labL.toFixed(2) + '</td><td>' + x.laba.toFixed(2) + '</td><td>' + x.labb.toFixed(2) + '</td><td><div style="width:30px;height:20px;background:' + x.hex + ';border:1px solid var(--line);border-radius:3px;"></div></td>';
          if (tbody.appendChild) tbody.appendChild(tr);
        }
      });
    }
  }

  function generate() {
    const nInput = document.getElementById('numColors');
    const n = parseInt(nInput ? nInput.value : '12') || 12;
    if (n < 1) return;
    const { adjusted, ranked } = adjustByLuminance(n);
    const display = [{ hex: '#000000', lchL: 0, lchC: 0, lchH: 0, labL: 0, laba: 0, labb: 0 }, ...adjusted, { hex: '#FFFFFF', lchL: 1, lchC: 0, lchH: 0, labL: 100, laba: 0, labb: 0 }];
    renderCircle(document.getElementById('colorCircle'), display, display.length);
    renderSwatches(document.getElementById('swatches'), display);
    renderTable(document.querySelector('#colorTable tbody'), adjusted, ranked);
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
