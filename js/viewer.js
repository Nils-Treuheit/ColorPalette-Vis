/* Fullscreen viewer with left/right arrow-key stepping */
(function (global) {
  'use strict';

  const MIN_PX = 180;
  const MAX_PX = 720;

  const state = { palette: null, items: [], position: 0, open: false };
  let els = {};
  let onChange = () => {};

  function sizeForViewport() {
    return Math.max(
      MIN_PX,
      Math.min(MAX_PX, global.innerWidth * 0.78, global.innerHeight * 0.62)
    );
  }

  function updateCaption(item) {
    const palette = state.palette;
    const overview = item.kind === 'palette';
    const colors = overview ? palette.colors : [item.face, item.feature, item.outline];
    const names = Palettes.namesFor(palette, item);

    const head = document.createElement('div');
    head.className = 'viewer-head';
    const index = document.createElement('strong');
    index.textContent = overview ? `all ${colors.length}` : `#${item.index}`;
    head.append(index, overview ? Chips.bar(colors, names) : Chips.list(colors, names));

    const values = document.createElement('div');
    values.className = 'viewer-values';
    if (overview) {
      values.append(`slices: all ${colors.length} colors · features + outline: `);
      const code = document.createElement('code');
      code.textContent = Palettes.format(palette, item.contrast);
      values.append(code);
    } else {
      ['face', 'feature', 'outline'].forEach((role, k) => {
        if (k) values.append(' · ');
        values.append(`${role} `);
        const code = document.createElement('code');
        code.textContent = Palettes.format(palette, colors[k]);
        if (names[k]) code.title = names[k];
        values.append(code);
      });
    }

    const count = document.createElement('span');
    count.className = 'viewer-count';
    count.textContent =
      `${state.position + 1} / ${state.items.length} · ${palette.title}`;

    els.caption.textContent = '';
    els.caption.append(head, values, count);
  }

  function update() {
    const item = state.items[state.position];
    Smiley.render(els.canvas, item, sizeForViewport());
    updateCaption(item);
    onChange(state.position);
  }

  function step(delta) {
    const n = state.items.length;
    state.position = (state.position + delta + n) % n;
    update();
  }

  function onKeydown(event) {
    if (!state.open) return;
    switch (event.key) {
      case 'ArrowLeft':
        step(-1);
        break;
      case 'ArrowRight':
        step(1);
        break;
      case 'Home':
        state.position = 0;
        update();
        break;
      case 'End':
        state.position = state.items.length - 1;
        update();
        break;
      case 'Escape':
        close();
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  function open(palette, items, position, changeHandler) {
    state.palette = palette;
    state.items = items;
    state.position = position;
    state.open = true;
    if (changeHandler) onChange = changeHandler;
    els.root.hidden = false;
    document.body.classList.add('viewer-open');
    update();
  }

  function close() {
    state.open = false;
    els.root.hidden = true;
    document.body.classList.remove('viewer-open');
    onChange(-1);
  }

  function init() {
    els = {
      root: document.getElementById('viewer'),
      canvas: document.getElementById('viewer-canvas'),
      caption: document.getElementById('viewer-caption'),
      prev: document.getElementById('viewer-prev'),
      next: document.getElementById('viewer-next'),
      close: document.getElementById('viewer-close'),
      backdrop: document.getElementById('viewer-backdrop'),
    };
    els.prev.addEventListener('click', () => step(-1));
    els.next.addEventListener('click', () => step(1));
    els.close.addEventListener('click', close);
    els.backdrop.addEventListener('click', close);
    document.addEventListener('keydown', onKeydown);
    global.addEventListener('resize', () => {
      if (state.open) update();
    });
  }

  global.Viewer = { init, open, close };
})(window);
