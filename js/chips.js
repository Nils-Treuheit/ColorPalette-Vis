/* Small colour swatches shared by the gallery tiles and the fullscreen viewer */
(function (global) {
  'use strict';

  /**
   * @param {string[]} colors #RRGGBB values, rendered left to right
   * @param {string[]} [titles] optional tooltip per swatch
   */
  function list(colors, titles) {
    const wrap = document.createElement('span');
    wrap.className = 'chips';
    colors.forEach((color, i) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.style.background = color;
      if (titles && titles[i]) chip.title = titles[i];
      wrap.appendChild(chip);
    });
    return wrap;
  }

  /**
   * Compact single-row bar of every colour (hard colour stops) — used for the
   * palette overview tile, where individual swatches would be too wide.
   * @param {string[]} colors #RRGGBB values
   * @param {string[]} [titles] optional tooltip per color
   */
  function bar(colors, titles) {
    const n = colors.length;
    const el = document.createElement('span');
    el.className = 'chip-bar';
    el.style.background = `linear-gradient(90deg, ${colors
      .map((c, i) => `${c} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`)
      .join(', ')})`;
    if (titles && titles.length) el.title = titles.join(' · ');
    return el;
  }

  global.Chips = { list, bar };
})(window);
