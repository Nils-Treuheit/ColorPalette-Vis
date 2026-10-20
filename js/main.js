/* App wiring: mode switch + palette switch -> gallery -> fullscreen viewer */
(function () {
  'use strict';

  const MODE_LABELS = { gray: 'Grayscale', color: 'Color' };
  const DEFAULT_SET = { gray: 'gray16', color: 'color16' };

  const state = {
    mode: 'gray',
    selection: { ...DEFAULT_SET },
    palette: null,
    items: [],
  };

  function updateMeta() {
    const triplets = state.items.length - 1;
    document.getElementById('gallery-meta').textContent =
      `${state.palette.title} · ${triplets} triplets + overview · ${state.items.length} smileys`;
  }

  function addOption(root, { label, title, active, data, onSelect }) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'segmented-option';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(active));
    btn.textContent = label;
    btn.title = title;
    Object.entries(data || {}).forEach(([key, value]) => {
      btn.dataset[key] = value;
    });
    if (active) btn.classList.add('is-active');
    btn.addEventListener('click', onSelect);
    root.appendChild(btn);
  }

  function buildModeSwitch() {
    const root = document.getElementById('mode-switch');
    root.textContent = '';
    Palettes.MODES.forEach((mode) => {
      addOption(root, {
        label: MODE_LABELS[mode],
        title: `${MODE_LABELS[mode]} mode`,
        active: mode === state.mode,
        data: { mode },
        onSelect: () => selectMode(mode),
      });
    });
  }

  function buildPaletteSwitch() {
    const root = document.getElementById('level-switch');
    root.textContent = '';
    Palettes.forMode(state.mode).forEach((palette) => {
      addOption(root, {
        label: palette.label,
        title: palette.title,
        active: palette.id === state.selection[state.mode],
        data: { levels: palette.label, setId: palette.id },
        onSelect: () => selectPalette(palette.id),
      });
    });
  }

  function selectPalette(id) {
    state.palette = Palettes.byId(id);
    state.selection[state.palette.mode] = id;
    state.items = Palettes.items(id);
    Gallery.render(state.palette, state.items, (position) =>
      Viewer.open(state.palette, state.items, position, Gallery.highlight)
    );
    buildPaletteSwitch();
    updateMeta();
  }

  function selectMode(mode) {
    state.mode = mode;
    buildModeSwitch();
    selectPalette(state.selection[mode]);
  }

  function main() {
    Viewer.init();
    buildModeSwitch();
    selectPalette(state.selection[state.mode]);
  }

  document.addEventListener('DOMContentLoaded', main);
})();
