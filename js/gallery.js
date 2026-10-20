/* Clickable grid of smiley thumbnails (palette overview + neighboring triplets) */
(function (global) {
  'use strict';

  const TILE_PX = 128;

  let onPick = () => {};
  let tiles = [];

  function buildTile(palette, item, position) {
    const overview = item.kind === 'palette';
    const colors = overview ? palette.colors : [item.face, item.feature, item.outline];
    const names = Palettes.namesFor(palette, item);
    const label = overview ? `all ${colors.length}` : `#${item.index}`;
    const info = overview
      ? `All ${colors.length} ${palette.mode === 'gray' ? 'gray levels' : 'colors'} — palette overview`
      : Palettes.valueList(palette, item).join(' · ');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.dataset.position = String(position);
    btn.title = `${info}. Click for fullscreen.`;
    btn.setAttribute('aria-label', `${info}. Open fullscreen.`);

    const canvas = document.createElement('canvas');
    Smiley.render(canvas, item, TILE_PX);
    btn.appendChild(canvas);

    const caption = document.createElement('span');
    caption.className = 'tile-caption';
    const index = document.createElement('span');
    index.className = 'tile-index';
    index.textContent = label;
    caption.append(index, overview ? Chips.bar(colors, names) : Chips.list(colors, names));
    btn.appendChild(caption);

    btn.addEventListener('click', () => onPick(position));
    return btn;
  }

  function render(palette, items, pickHandler) {
    onPick = pickHandler;
    const grid = document.getElementById('gallery');
    grid.textContent = '';
    tiles = items.map((item, position) => {
      const tile = buildTile(palette, item, position);
      grid.appendChild(tile);
      return tile;
    });
  }

  /** Highlight the tile that is currently shown in the fullscreen viewer. */
  function highlight(position) {
    tiles.forEach((tile, i) => tile.classList.toggle('is-active', i === position));
  }

  global.Gallery = { TILE_PX, render, highlight };
})(window);
