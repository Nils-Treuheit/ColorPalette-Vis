/* Palette sets — grayscale ramps plus color-safe categorical palettes.

   Every colour is a #RRGGBB string. Grayscale ramps are derived with
   round(i * 255 / (n - 1)), identical to tools/generate_smileys.py. */
(function (global) {
  'use strict';

  const MODES = ['gray', 'color'];

  /** 0..255 gray value -> #RRGGBB */
  function grayHex(value) {
    const byte = value.toString(16).padStart(2, '0').toUpperCase();
    return `#${byte}${byte}${byte}`;
  }

  /** rgb(…) -> #RRGGBB */
  function rgb(r, g, b) {
    return (
      '#' +
      [r, g, b].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')
    );
  }

  /** n evenly spaced gray levels, 0..255. */
  function grayRamp(n) {
    const colors = [];
    for (let i = 0; i < n; i++) {
      colors.push(grayHex(Math.round((i * 255) / (n - 1))));
    }
    return colors;
  }

  const set = (mode, label, title, colors, names) => ({
    id: `${mode}${label}`,
    mode,
    label,
    title,
    colors,
    names,
  });

  // --- categorical colour sets ---------------------------------------------
  // Hex values exactly as specified; names are display labels only.

  const HIGH_CONTRAST4 = {
    title: '4 colors — high-contrast categorical',
    names: ['Blue', 'Orange', 'Bluish Green', 'Vermilion'],
    colors: ['#0072B2', '#E69F00', '#009E73', '#D55E00'],
  };

  const WONG8 = {
    title: '8 colors — Wong / Okabe-Ito',
    names: [
      'Black', 'Orange', 'Sky Blue', 'Bluish Green',
      'Yellow', 'Blue', 'Vermilion', 'Reddish Purple',
    ],
    colors: [
      '#000000', '#E69F00', '#56B4E9', '#009E73',
      '#F0E442', '#0072B2', '#D55E00', '#CC79A7',
    ],
  };

  const TOL16 = {
    title: '16 colors — Paul Tol extended',
    names: [
      'Deep Blue', 'Real Blue', 'Light Blue', 'Green',
      'Dark Green', 'Light Green', 'Yellow-Brown', 'Red',
      'Pink', 'Purple', 'Brown', 'Ash',
      'Cyan-Grey', 'Olive-Grey', 'Sand', 'Charcoal',
    ],
    colors: [
      '#332288', '#88CCEE', '#44AA99', '#117733',
      '#999933', '#DDCC77', '#CC6677', '#882255',
      '#AA4499', '#661100', '#6699CC', '#AA4466',
      '#998811', '#661155', '#FFAABB', '#777777',
    ],
  };

  const HARMONIC16 = {
    title: '16 colors — harmonic hue wheel',
    names: [
      'Red', 'Red-Orange', 'Orange', 'Amber',
      'Yellow', 'Lime', 'Green', 'Teal',
      'Cyan', 'Azure', 'Blue', 'Blue-Violet',
      'Purple', 'Magenta', 'Rose', 'Raspberry',
    ],
    colors: [
      [255, 0, 0], [255, 64, 0], [255, 128, 0], [255, 192, 0],
      [255, 255, 0], [192, 255, 0], [0, 255, 0], [0, 255, 128],
      [0, 255, 255], [0, 128, 255], [0, 0, 255], [64, 0, 255],
      [128, 0, 255], [255, 0, 255], [255, 0, 192], [255, 0, 128],
    ].map(([r, g, b]) => rgb(r, g, b)),
  };

  const CONTRAST16 = {
    title: '16 colors — high contrast',
    names: [
      'Red', 'Green', 'Gold', 'Blue',
      'Orange', 'Purple', 'Cyan', 'Magenta',
      'Lime', 'Pink', 'Dark Cyan', 'Lavender',
      'Brown', 'Beige', 'Maroon', 'Olive',
    ],
    colors: [
      [230, 25, 75], [60, 180, 75], [255, 215, 0], [0, 130, 200],
      [245, 130, 48], [145, 30, 180], [70, 240, 240], [240, 50, 230],
      [0, 255, 0], [255, 192, 203], [0, 128, 128], [181, 126, 220],
      [170, 110, 40], [255, 250, 200], [128, 0, 0], [128, 128, 0],
    ].map(([r, g, b]) => rgb(r, g, b)),
  };

  // --- lightness-spread variants: 4lH / 4lL … 16clH / 16clL ----------------
  //
  // A base palette re-encoded by rewriting ONLY the lightness channel:
  //   "lH" sets it in HSL (keeping hue and saturation),
  //   "lL" sets CIE Lab L* (keeping the hue angle; chroma is reduced only
  //        where the result would fall outside the sRGB gamut).
  // For n colours the levels are the inner n of n+2 evenly spaced values, so
  // 0% and 100% are deliberately left out — 4 colours aim at 20/40/60/80%.
  // Colours are assigned to levels by their original lightness (darkest gets
  // the darkest level) and keep their position in the palette.
  // Mirrors spread_lightness() in tools/generate_smileys.py.

  const round255 = (v) => Math.max(0, Math.min(255, Math.floor(v * 255 + 0.5)));
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const LAB_EPS = 216 / 24389;
  const LAB_KAPPA = 24389 / 27;

  /** Target lightness levels (%) for n colours: the inner n of n+2. */
  function lightLevels(n) {
    const levels = [];
    for (let i = 0; i < n; i++) levels.push((100 * (i + 1)) / (n + 1));
    return levels;
  }

  /** #RRGGBB -> [h°, s%, l%] */
  function hexToHsl(color) {
    const [r0, g0, b0] = toRgb(color);
    const r = r0 / 255;
    const g = g0 / 255;
    const b = b0 / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s * 100, l * 100];
  }

  /** [h°, s%, l%] -> #RRGGBB */
  function hslToHex(h, s, l) {
    const hh = ((h % 360) + 360) % 360 / 360;
    const ss = s / 100;
    const ll = l / 100;
    if (ss === 0) return rgb(round255(ll), round255(ll), round255(ll));
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    const f = (t) => {
      if (t < 0) t += 1;
      else if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return rgb(round255(f(hh + 1 / 3)), round255(f(hh)), round255(f(hh - 1 / 3)));
  }

  /** sRGB (0..1) -> linear light */
  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  /** linear light -> sRGB (0..1) */
  const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

  /** #RRGGBB -> [L*, a*, b*], D65 */
  function hexToLab(color) {
    const [r0, g0, b0] = toRgb(color);
    const r = toLinear(r0 / 255);
    const g = toLinear(g0 / 255);
    const b = toLinear(b0 / 255);
    const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
    const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
    const f = (t) => (t > LAB_EPS ? t ** (1 / 3) : (841 / 108) * t + 4 / 29);
    const fx = f(x);
    const fy = f(y);
    const fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  /** [L*, a*, b*] -> linear-light rgb triple (no gamut handling) */
  function labToLinear(L, a, b) {
    const fy = (L + 16) / 116;
    const fx = fy + a / 500;
    const fz = fy - b / 200;
    const finv = (t) => {
      const t3 = t ** 3;
      return t3 > LAB_EPS ? t3 : (116 * t - 16) / LAB_KAPPA;
    };
    const x = finv(fx) * 0.95047;
    const y = finv(fy);
    const z = finv(fz) * 1.08883;
    return [
      x * 3.2404542 + y * -1.5371385 + z * -0.4985314,
      x * -0.969266 + y * 1.8760108 + z * 0.041556,
      x * 0.0556434 + y * -0.2040259 + z * 1.0572252,
    ];
  }

  /** [L*, a*, b*] -> #RRGGBB, shrinking chroma until the colour fits sRGB. */
  function labToHex(L, aStar, bStar) {
    const chroma0 = Math.sqrt(aStar * aStar + bStar * bStar);
    const h = Math.atan2(bStar, aStar);
    const fits = (c) =>
      labToLinear(L, c * Math.cos(h), c * Math.sin(h)).every(
        (v) => v >= -1e-9 && v <= 1 + 1e-9
      );
    let chroma = chroma0;
    if (!fits(chroma)) {
      let lo = 0;
      let hi = chroma0;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
      chroma = lo;
    }
    const [r, g, b] = labToLinear(L, chroma * Math.cos(h), chroma * Math.sin(h));
    return rgb(
      round255(toSrgb(clamp01(r))),
      round255(toSrgb(clamp01(g))),
      round255(toSrgb(clamp01(b)))
    );
  }

  /**
   * Rewrite only the lightness of every colour of a base set.
   * @param {{colors: string[]}} base base palette (kept in the result order)
   * @param {'H'|'L'} space HSL lightness or Lab L*
   * @returns {string[]} #RRGGBB colours
   */
  function spreadLightness(base, space) {
    const keys = base.colors.map((color) =>
      space === 'H' ? hexToHsl(color)[2] : hexToLab(color)[0]
    );
    const order = base.colors
      .map((color, i) => i)
      .sort((a, b) => keys[a] - keys[b] || a - b);
    const levels = lightLevels(base.colors.length);
    const colors = new Array(base.colors.length);
    order.forEach((i, rank) => {
      const target = levels[rank];
      if (space === 'H') {
        const [h, s] = hexToHsl(base.colors[i]);
        colors[i] = hslToHex(h, s, target);
      } else {
        const [, a, b] = hexToLab(base.colors[i]);
        colors[i] = labToHex(target, a, b);
      }
    });
    return colors;
  }

  /** The two lightness-spread variants ("lH" HSL, "lL" Lab) of a colour set. */
  function lightnessVariants(baseLabel, base) {
    return ['H', 'L'].map((space) =>
      set(
        'color',
        `${baseLabel}l${space}`,
        `${base.title} (lightness: ${space === 'H' ? 'HSL L' : 'Lab L*'})`,
        spreadLightness(base, space),
        base.names
      )
    );
  }

  /** Bluish Green (#009E73) — substitutes Green in the final 16-colour set. */
  const BLUISH_GREEN = '#009E73';

  /** Strawberry Red (#E61224) — the final set's red. */
  const STRAWBERRY_RED = '#E61224';

  /** Peppermint Toad (#009933) — the final set's green (replaces Bluish Green). */
  const PEPPERMINT_TOAD = '#009933';

  /** Amber Gold (#EECA00) — the final set's gold. */
  const AMBER_GOLD = '#EECA00';

  /** Royal Blue (#4169E1) — the final set's blue. */
  const ROYAL_BLUE = '#4169E1';

  /** Electric Laser Lime (#1AFF2E) — the final set's lime. */
  const ELECTRIC_LASER_LIME = '#1AFF2E';

  /** Funky Gray (#777777) — the final set's neutral (olive slot). */
  const FUNKY_GRAY = '#777777';

  /** Smokey Black (#0F0807) — the final set's darkest colour (maroon slot). */
  const SMOKEY_BLACK = '#0F0807';

  // Display names for the hand-picked colours, by original 16c index. The
  // colours themselves are written into finalSixteen()'s body.
  const FINAL16_NAMES = {
    0: 'Strawberry Red',
    1: 'Peppermint Toad',
    2: 'Amber Gold',
    3: 'Royal Blue',
    8: 'Electric Laser Lime',
    14: 'Smokey Black',
    15: 'Funky Gray',
  };

  // New index -> original 16c index. Reads, in order: Orange, Royal Blue,
  // Peppermint Toad, Amber Gold, Magenta, Cyan, Smokey Black, Strawberry Red,
  // Funky Gray, Electric Laser Lime, Brown, Pink, Purple, Beige, Lavender,
  // Dark Cyan.
  const FINAL16_ORDER = [4, 3, 1, 2, 7, 6, 14, 0, 15, 8, 12, 9, 5, 13, 11, 10];

  /**
   * The final 16-colour set `16f`, assembled in four steps:
   *   1. Bluish Green substitutes Green in the original 16c colours,
   *   2. the lightness is spread in Lab L* (the 16clL rule),
   *   3. eight colours are then replaced by hand — cyan taken from 16clH, and
   *      Strawberry Red, Peppermint Toad, Amber Gold, Royal Blue, Electric
   *      Laser Lime, Funky Gray and Smokey Black picked outright,
   *   4. the colours are re-ordered: new[i] = old[FINAL16_ORDER[i]].
   */
  function finalSixteen() {
    const base = {
      colors: CONTRAST16.colors.map((c, i) => (i === 1 ? BLUISH_GREEN : c)),
      names: CONTRAST16.names.map((n, i) => FINAL16_NAMES[i] || n),
    };
    const colors = spreadLightness(base, 'L');
    const hsl = spreadLightness(CONTRAST16, 'H');
    colors[0] = STRAWBERRY_RED; // red
    colors[1] = PEPPERMINT_TOAD; // green
    colors[2] = AMBER_GOLD; // gold
    colors[3] = ROYAL_BLUE; // blue
    colors[6] = hsl[6]; // Cyan (the one colour still taken from 16clH)
    colors[8] = ELECTRIC_LASER_LIME; // lime
    colors[14] = SMOKEY_BLACK; // maroon slot -> smokey black
    colors[15] = FUNKY_GRAY; // olive slot -> funky gray
    return {
      title: '16 colors — final mix',
      colors: FINAL16_ORDER.map((i) => colors[i]),
      names: FINAL16_ORDER.map((i) => base.names[i]),
    };
  }

  const FINAL16 = finalSixteen();

  /**
   * `16fa` — a frozen snapshot of `16f`'s Lab L* spread (the `16flL` coding),
   * taken just before the Funky Gray / Smokey Black rework and arranged in the
   * order that maximises the worst neighbouring triplet.
   */
  const FINAL16_ALT = {
    title: '16 colors — final mix, re-ordered (Lab L*)',
    names: [
      'Pink', 'Amber Gold', 'Electric Laser Lime', 'Neutral Gray',
      'Strawberry Red', 'Magenta', 'Dark Cyan', 'Beige',
      'Royal Blue', 'Maroon', 'Peppermint Toad', 'Lavender',
      'Orange', 'Cyan', 'Purple', 'Brown',
    ],
    colors: [
      '#D99DA8', '#DCBB00', '#00ED25', '#454545',
      '#C5001B', '#C800C0', '#003131', '#F5F0BE',
      '#004CBA', '#250C00', '#009331', '#AD77D4',
      '#F07E2C', '#88EEEE', '#39004B', '#543000',
    ],
  };

  // --- all selectable sets --------------------------------------------------

  const SETS = [
    // grayscale
    set('gray', '4', '4 grayscale levels', [0, 85, 170, 255].map(grayHex)),
    set('gray', '8', '8 grayscale levels', [0, 36, 73, 110, 146, 182, 219, 255].map(grayHex)),
    set('gray', '16', '16 grayscale levels', grayRamp(16)),
    set('gray', '24', '24 grayscale levels', grayRamp(24)),
    set('gray', '32', '32 grayscale levels', grayRamp(32)),
    set('gray', '64', '64 grayscale levels', grayRamp(64)),
    // color — base sets and their lightness-spread variants (lH = HSL L, lL = Lab L*)
    set('color', '4', HIGH_CONTRAST4.title, HIGH_CONTRAST4.colors, HIGH_CONTRAST4.names),
    ...lightnessVariants('4', HIGH_CONTRAST4),
    set('color', '8', WONG8.title, WONG8.colors, WONG8.names),
    ...lightnessVariants('8', WONG8),
    set('color', '16', TOL16.title, TOL16.colors, TOL16.names),
    ...lightnessVariants('16', TOL16),
    set('color', '16h', HARMONIC16.title, HARMONIC16.colors, HARMONIC16.names),
    set('color', '16c', CONTRAST16.title, CONTRAST16.colors, CONTRAST16.names),
    ...lightnessVariants('16c', CONTRAST16),
    set('color', '16f', FINAL16.title, FINAL16.colors, FINAL16.names),
    ...lightnessVariants('16f', FINAL16),
    set('color', '16fa', FINAL16_ALT.title, FINAL16_ALT.colors, FINAL16_ALT.names),
  ];

  function byId(id) {
    const found = SETS.find((s) => s.id === id);
    if (!found) throw new Error(`Unknown palette set: ${id}`);
    return found;
  }

  function forMode(mode) {
    return SETS.filter((s) => s.mode === mode);
  }

  function toRgb(color) {
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
  }

  /** The palette colour that differs most from all the others. */
  function contrastColor(colors) {
    let best = colors[0];
    let bestScore = -1;
    for (const color of colors) {
      const [r, g, b] = toRgb(color);
      let score = 0;
      for (const other of colors) {
        const [r2, g2, b2] = toRgb(other);
        score += (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
      }
      if (score > bestScore) {
        bestScore = score;
        best = color;
      }
    }
    return best;
  }

  /**
   * Neighboring triplet combinations (i, i+1, i+2) of a set's colours.
   * First three for 8 colours: (0,1,2), (1,2,3), (2,3,4) ...
   * @returns [{kind:'triplet', index, face, feature, outline}] — #RRGGBB strings
   */
  function triplets(setId) {
    const { colors } = byId(setId);
    const out = [];
    for (let i = 0; i + 2 < colors.length; i++) {
      out.push({
        kind: 'triplet',
        index: i,
        face: colors[i],
        feature: colors[i + 1],
        outline: colors[i + 2],
      });
    }
    return out;
  }

  /**
   * Gallery items of a set: the palette overview first (one smiley that uses
   * every colour), then every neighboring triplet.
   * @returns [{kind:'palette', colors, contrast}] + triplet items
   */
  function items(setId) {
    const { colors } = byId(setId);
    return [{ kind: 'palette', colors, contrast: contrastColor(colors) }, ...triplets(setId)];
  }

  /** Display value of one colour: gray level (0..255) or the hex code. */
  function format(s, color) {
    return s.mode === 'gray' ? String(parseInt(color.slice(1, 3), 16)) : color;
  }

  function describeColor(s, color, name) {
    return format(s, color) + (name ? ` (${name})` : '');
  }

  /** Display names of an item's colours ([] when the set is unnamed). */
  function namesFor(s, item) {
    if (!s.names) return [];
    if (item.kind === 'palette') return s.names;
    return [s.names[item.index], s.names[item.index + 1], s.names[item.index + 2]];
  }

  /** Readable value strings for an item: three roles, or every palette colour. */
  function valueList(s, item) {
    if (item.kind === 'palette') {
      const names = s.names || [];
      return s.colors.map((color, i) => describeColor(s, color, names[i]));
    }
    const names = namesFor(s, item);
    return [item.face, item.feature, item.outline].map((color, k) =>
      `${['face', 'feature', 'outline'][k]} ${describeColor(s, color, names[k])}`
    );
  }

  global.Palettes = {
    MODES,
    SETS,
    byId,
    forMode,
    triplets,
    items,
    format,
    namesFor,
    valueList,
  };
})(window);
