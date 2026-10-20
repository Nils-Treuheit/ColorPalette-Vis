# Color-Safe Smiley Gallery

A tiny static web app that renders a gallery of smiley faces built from
**neighboring triplet combinations** of color-safe and grayscale palettes.

A **Grayscale / Color** switch picks the render mode; a second switch picks the
palette within that mode:

| mode | palette buttons |
| ---- | --------------- |
| Grayscale | `4`, `8`, `16`, `24`, `32`, `64` |
| Color | `4`, `4lH`, `4lL`, `8`, `8lH`, `8lL`, `16`, `16lH`, `16lL`, `16h`, `16c`, `16clH`, `16clL`, `16f`, `16flH`, `16flL`, `16fa` |

The `lH` / `lL` buttons are lightness-spread variants of the base palettes (see
[Color sets](#color-sets)).

Each smiley uses three neighboring shades/colors of one palette:

| feature  | color            |
| -------- | ---------------- |
| face     | `palette[i]`     |
| features | `palette[i + 1]` |
| outline  | `palette[i + 2]` |

So the first triplets are `(0, 1, 2)`, `(1, 2, 3)`, `(2, 3, 4)`, … and a palette
with `n` colors yields `n - 2` triplets. **Every gallery additionally starts with
a palette overview** — one smiley that uses the entire palette: the face is a pie
slice per color (clockwise from 12 o'clock) and the border/eyes/mouth use the
palette's most distinct color, so the whole palette's contrastiveness is visible
in a single image.

| palette | colors | smileys (overview + triplets) |
| ------- | ------ | ----------------------------- |
| gray 4 / 8 / 16 / 24 / 32 / 64 | 4 / 8 / 16 / 24 / 32 / 64 | 3 / 7 / 15 / 23 / 31 / 63 |
| color 4 (high-contrast categorical) | 4 | 3 |
| color 4lH / 4lL (lightness spread) | 4 | 3 |
| color 8 (Wong / Okabe-Ito) | 8 | 7 |
| color 8lH / 8lL (lightness spread) | 8 | 7 |
| color 16 (Paul Tol extended) | 16 | 15 |
| color 16lH / 16lL (lightness spread) | 16 | 15 |
| color 16h (harmonic hue wheel) | 16 | 15 |
| color 16c (high contrast) | 16 | 15 |
| color 16clH / 16clL (lightness spread) | 16 | 15 |
| color 16f (final mix) | 16 | 15 |
| color 16flH / 16flL (lightness spread of 16f) | 16 | 15 |
| color 16fa (Lab L\* spread of the previous 16f, re-ordered) | 16 | 15 |

Totals: **142 grayscale + 195 color = 337 smileys** (23 of them palette overviews).

## Run it

No build step, no dependencies. Either open the file directly:

```bash
xdg-open index.html        # file:// works — plain <script> tags, no modules
```

…or serve the folder (recommended for mobile / LAN access):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls

- **Grayscale / Color** (top-right): switch render mode. Each mode remembers its
  own last palette selection.
- **Palette buttons** below it: gray `4 8 16 24 32 64`, color
  `4 4lH 4lL 8 8lH 8lL 16 16lH 16lL 16h 16c 16clH 16clL 16f 16flH 16flL 16fa`.
- **Click any smiley** in the gallery → fullscreen view.
- <kbd>←</kbd> / <kbd>→</kbd> step through smileys, <kbd>Home</kbd> / <kbd>End</kbd>
  jump to the ends, <kbd>Esc</kbd> closes (also the ✕ button or clicking the backdrop).
- On touch devices the ‹ › buttons do the stepping.

Gallery tiles show a label plus swatches — the palette overview tile shows the
compact full-palette bar, triplet tiles their three colors (hover a tile for the
exact values and color names). The fullscreen caption shows the face / feature /
outline values — gray level `0..255` or hex `#RRGGBB` — and, for the overview,
the color used for the features.

## Layout

```
color_safe_smiley_faces/
├── index.html               # markup: mode + palette switch, gallery, viewer
├── css/
│   └── style.css            # dark theme, responsive grid, fullscreen viewer
├── js/
│   ├── palettes.js          # palette sets (gray + color) and triplet generator
│   ├── chips.js             # small color swatches shared by gallery and viewer
│   ├── smiley.js            # canvas renderer (port of the Python draw_smiley)
│   ├── gallery.js           # clickable thumbnail grid
│   ├── viewer.js            # fullscreen viewer + keyboard stepping
│   └── main.js              # wiring: mode/palette switch → gallery → viewer
└── tools/
    └── generate_smileys.py  # offline PNG exporter (same palettes/drawing)
```

The browser renders every smiley with **canvas at runtime**, so there are no image
files to generate or ship — switching mode or palette is instant, and the
fullscreen view is always pixel-crisp thanks to device-pixel-ratio scaling.

## Color sets

- **4** — high-contrast categorical (`#0072B2`, `#E69F00`, `#009E73`, `#D55E00`)
- **8** — Wong / Okabe-Ito, safe for protanopia, deuteranopia, tritanopia
- **16** — Paul Tol extended
- **16h** — harmonic hue wheel (16 hues in 22.5° steps)
- **16c** — maximum visual separability. Four entries were tightened after a
  perceptual audit (CIE76 ΔE) showed the stated values were hard to tell apart
  at smiley size: Gold `#FFD700` (was `#FFE119`), Lime `#00FF00` (was `#D2F53C`),
  Pink `#FFC0CB` (was `#FABED4`) and Lavender `#B57EDC` (was a near-white
  `#DCBEFF`). The palette's smallest pairwise ΔE rose from 25.6 to 29.1 and the
  Pink↔Lavender pair from 25.6 to 50.7. All other colors are verbatim from the
  source lists.
- **4lH, 4lL, 8lH, 8lL, 16lH, 16lL, 16clH, 16clL, 16flH, 16flL** — the `4`, `8`,
  `16`, `16c` and `16f` sets re-encoded with an evenly spread lightness, added to
  test whether they are easier to tell apart than the originals. Every color
  keeps its hue; only the lightness channel is rewritten:
  - `lH` sets the **HSL** lightness (hue and saturation preserved), `lL` sets the
    **CIE Lab L\*** (hue angle preserved; chroma shrinks only where the result
    would fall outside the sRGB gamut).
  - For `n` colors the levels are the inner `n` of `n + 2` evenly spaced values,
    so `0%` and `100%` are deliberately left out: `4` → `20/40/60/80%`,
    `8` → `11.1…88.9%`, `16` → `5.9…94.1%`.
  - A color is assigned to a level by its original lightness (darkest → darkest
    level) and keeps its position in the palette, so the hue structure of the
    base set is unchanged.

  The full CIE76 ΔE comparison against every base palette is in
  [Differentiability](#differentiability-of-the-color-sets) below. In short:
  `4`, `8` and `16` all gain separation on both columns, while `16c` — already
  tuned by a perceptual audit — loses its global minimum (29.1 → 24.5/25.9)
  though `16clL` still improves its worst triplet (29.3 → 38.7). `lH` is more
  prone to this than `lL`, because equally spaced *HSL* levels are not equally
  spaced perceived lightness: olive at HSL 17.6% and brown at HSL 35.3% both land
  on L\* ≈ 37, while `lL` keeps them ≈ 5.9 L\* points apart as the grid intends.
- **16f** — the final 16-color mix, assembled from `16c` in four steps:
  1. **Bluish Green `#009E73`** substitutes Green `#3CB44B` — here that step only
     fixes the lightness ranking; its own color is replaced again in step 3.
  2. The lightness is spread in **Lab L\*** (the `16clL` rule). The spread lands
     every color on its assigned level of the `5.9 … 94.1` grid (max error
     0.15 L\*).
  3. Eight colors are then replaced by hand. Cyan is the only one still taken
     from **`16clH`** — `#90F6F6`, where the Lab spread gives `#30E3E3` — and
     the other seven are picked outright: **Strawberry Red `#E61224`** (spread
     `#760020`), **Peppermint Toad `#009933`** (`#007F5C`), **Amber Gold
     `#EECA00`** (`#DDBA00`), **Royal Blue `#4169E1`** (`#00669E`), **Electric
     Laser Lime `#1AFF2E`** (`#39FF29`), **Funky Gray `#777777`** (the olive
     slot, where the spread had `#565600`) and **Smokey Black `#0F0807`** (the
     maroon slot). They keep their natural lightness rather than the level the
     spread assigned, so seven of the eight sit off their assigned level —
     Strawberry Red by far the most (L\* 48.7 where the spread wanted 23.5) —
     and only Electric Laser Lime lands on its own level anyway (87.9 vs 88.2).
     **9 of the 16 colors end up on their assigned level.**
  4. The colors are re-ordered to
     `Orange, Royal Blue, Peppermint Toad, Amber Gold, Magenta, Cyan,
     Smokey Black, Strawberry Red, Funky Gray, Electric Laser Lime, Brown, Pink,
     Purple, Beige, Lavender, Dark Cyan`, so neighboring triplets pair more
     distinct colors.

  The 16 final colors in that order, with both lightness measures (`HSL L` is
  the HSL lightness — the channel the `lH` sets rescale):

  | # | color | hex | L\* (Lab) | HSL L |
  | --- | --- | --- | --- | --- |
  | 0 | Orange | `#F07E2C` | 64.7 | 55.7 |
  | 1 | Royal Blue | `#4169E1` | 47.8 | 56.9 |
  | 2 | Peppermint Toad | `#009933` | 55.1 | 30.0 |
  | 3 | Amber Gold | `#EECA00` | 82.1 | 46.7 |
  | 4 | Magenta | `#DF13D6` | 53.0 | 47.5 |
  | 5 | Cyan | `#90F6F6` | 91.0 | 76.5 |
  | 6 | Smokey Black | `#0F0807` | 2.6 | 4.3 |
  | 7 | Strawberry Red | `#E61224` | 48.7 | 48.6 |
  | 8 | Funky Gray | `#777777` | 50.0 | 46.7 |
  | 9 | Electric Laser Lime | `#1AFF2E` | 87.9 | 55.1 |
  | 10 | Brown | `#673B00` | 29.4 | 20.2 |
  | 11 | Pink | `#D99DA8` | 70.7 | 73.3 |
  | 12 | Purple | `#39004B` | 11.8 | 14.7 |
  | 13 | Beige | `#F5F0BE` | 94.1 | 85.3 |
  | 14 | Lavender | `#AD77D4` | 58.8 | 64.9 |
  | 15 | Dark Cyan | `#003131` | 17.5 | 9.6 |

  The re-ordering keeps `16f`'s worst **face/feature/outline triplet** well
  above `16c`'s (29.3 → 43.8). That limit is triplet #11 (`Pink, Purple,
  Beige`), set by the low-chroma Pink ↔ Beige pair, so the reworked dark end
  (Smokey Black, Funky Gray) and the brown swap both help rather than hurt. Its
  globally closest pair is Smokey Black ↔ Dark Cyan (23.2), below `16c`'s 29.1:
  a near-black and a dark teal have little hue to separate them — see the
  [table below](#differentiability-of-the-color-sets).
- **16flH / 16flL** — the two lightness-spread variants of `16f` itself, built
  exactly like the other `lH` / `lL` pairs but starting from the final mix: the
  16 colors are ordered by their current lightness (HSL L for `16flH`, Lab L\*
  for `16flL`), each is moved onto its own level of the evenly spaced
  `5.9 … 94.1` grid, and the result is put back into `16f`'s index order. So
  the palettes differ from `16f` only in lightness, and the triplet sequence
  stays the same. `16flL` lands all 16 colors on the Lab grid (max error
  0.14 L\*); `16flH` puts every color on its HSL level exactly, but those
  levels are *not* evenly spaced in perceived lightness, so only 4 of the 16
  come within 0.5 L\* of any Lab grid level (Amber Gold and Royal Blue even
  collapse to a 0.5 L\* gap) — the same `lH` caveat as elsewhere.

  | # | color | `16f` | `16flH` (HSL L) | `16flL` (L\* Lab) |
  | --- | --- | --- | --- | --- |
  | 0 | Orange | `#F07E2C` | `#F39857` | `#F07E2C` |
  | 1 | Royal Blue | `#4169E1` | `#7D99EB` | `#003F9E` |
  | 2 | Peppermint Toad | `#009933` | `#009632` | `#009331` |
  | 3 | Amber Gold | `#EECA00` | `#B49900` | `#DCBB00` |
  | 4 | Magenta | `#DF13D6` | `#DD13D4` | `#C800C0` |
  | 5 | Cyan | `#90F6F6` | `#C7FBFB` | `#88EEEE` |
  | 6 | Smokey Black | `#0F0807` | `#140B0A` | `#171211` |
  | 7 | Strawberry Red | `#E61224` | `#EE2032` | `#AA0015` |
  | 8 | Funky Gray | `#777777` | `#696969` | `#616161` |
  | 9 | Electric Laser Lime | `#1AFF2E` | `#2DFF3F` | `#00ED25` |
  | 10 | Brown | `#673B00` | `#784500` | `#543000` |
  | 11 | Pink | `#D99DA8` | `#E6BEC5` | `#D99DA8` |
  | 12 | Purple | `#39004B` | `#44005A` | `#39004B` |
  | 13 | Beige | `#F5F0BE` | `#FBF9E5` | `#F5F0BE` |
  | 14 | Lavender | `#AD77D4` | `#C8A4E2` | `#AD77D4` |
  | 15 | Dark Cyan | `#003131` | `#003C3C` | `#003131` |

  Once spread, they no longer share `16f`'s limiting triplet. `16flL` keeps a
  dark one as its worst — triplet #6 (`Smokey Black, Strawberry Red, Funky
  Gray`, ΔE 35.3), where its Lab grid pulls the gray down to 41.1 L\*, against
  Smokey Black's 5.9 — while `16flH`'s worst is a *light* one, triplet #11
  (`Pink, Purple, Beige`, ΔE 26.1), where the HSL levels place Pink and Beige at
  80.6 and 97.6 L\* and their low chroma leaves only 26.1 ΔE between them. So
  `16f` itself now has the best worst triplet of the three (43.8), and `16flL`
  still beats `16flH` despite its darker weakest link. Even so, the globally
  closest *pair* of each sits below `16f`'s: Smokey Black ↔ Dark Cyan for
  `16flL` (21.4) and Cyan ↔ Beige for `16flH` (20.6) — a near-black and a pale
  low-chroma pair carry too little hue to be separated by lightness alone.
- **16fa** — a frozen snapshot that banks the best ordering found for the final
  mix: the Lab-L\* spread of the *previous* `16f` (i.e. the `16flL` coding,
  still with its old Neutral Gray `#454545` and Maroon `#250C00`), rearranged as
  `Pink, Amber Gold, Electric Laser Lime, Neutral Gray, Strawberry Red, Magenta,
  Dark Cyan, Beige, Royal Blue, Maroon, Peppermint Toad, Lavender, Orange, Cyan,
  Purple, Brown`. That order was chosen by search to maximise the worst
  neighboring triplet, and it shows: **ΔE 70.1**, against `16flL`'s 35.3 and the
  old order's 38.7 — every consecutive three is now well separated. Its one weak
  spot is the Neutral Gray ↔ Dark Cyan pair (19.6), which no ordering can pull
  apart.

  | # | color | hex | L\* (Lab) | HSL L |
  | --- | --- | --- | --- | --- |
  | 0 | Pink | `#D99DA8` | 70.7 | 73.3 |
  | 1 | Amber Gold | `#DCBB00` | 76.5 | 43.1 |
  | 2 | Electric Laser Lime | `#00ED25` | 82.2 | 46.5 |
  | 3 | Neutral Gray | `#454545` | 29.3 | 27.1 |
  | 4 | Strawberry Red | `#C5001B` | 41.1 | 38.6 |
  | 5 | Magenta | `#C800C0` | 47.1 | 39.2 |
  | 6 | Dark Cyan | `#003131` | 17.5 | 9.6 |
  | 7 | Beige | `#F5F0BE` | 94.1 | 85.3 |
  | 8 | Royal Blue | `#004CBA` | 35.4 | 36.5 |
  | 9 | Maroon | `#250C00` | 5.9 | 7.3 |
  | 10 | Peppermint Toad | `#009331` | 53.0 | 28.8 |
  | 11 | Lavender | `#AD77D4` | 58.8 | 64.9 |
  | 12 | Orange | `#F07E2C` | 64.7 | 55.7 |
  | 13 | Cyan | `#88EEEE` | 88.2 | 73.3 |
  | 14 | Purple | `#39004B` | 11.8 | 14.7 |
  | 15 | Brown | `#543000` | 23.7 | 16.5 |

## Differentiability of the color sets

Do they differentiate better? — measured as **CIE76 ΔE** in CIE Lab over every
pair of colors (`min pair`, `avg pair`) and inside every neighboring
face/feature/outline triplet (`min within triplet`). Higher is better, and a
palette is only as good as its *worst* triplet, so that column is the one to
watch. `L* span` and `min L* gap` describe the encoded lightness: a `min L* gap`
of `0.0` means two colors share a lightness and can only be told apart by hue.

| set | min pair | avg pair | min within triplet | L\* span | min L\* gap |
| --- | --- | --- | --- | --- | --- |
| `4` — high-contrast categorical (Wong / Okabe-Ito, 4-color subset) | 33.4 | 88.2 | 33.4 | 24.6 | 3.5 |
| `4lH` — high-contrast categorical (HSL luminance adjusted) | 48.2 ↑ | 81.2 | 48.2 ↑ | 52.4 | 14.7 |
| `4lL` — high-contrast categorical (L\*-Lab luminance adjusted) | 47.7 ↑ | 81.0 | 47.7 ↑ | 60.1 | 19.9 |
| `8` — Wong / Okabe-Ito | 26.4 | 83.1 | 53.6 | 89.1 | 0.8 |
| `8lH` — Wong / Okabe-Ito (HSL luminance adjusted) | 28.2 ↑ | 77.6 | 56.5 ↑ | 80.6 | 1.9 |
| `8lL` — Wong / Okabe-Ito (L\*-Lab luminance adjusted) | 27.8 ↑ | 75.9 | 54.1 ↑ | 77.5 | 11.0 |
| `16` — Paul Tol extended | 11.4 | 64.4 | 22.8 | 60.8 | 0.1 |
| `16lH` — Paul Tol extended (HSL luminance adjusted) | 12.2 ↑ | 61.8 | 26.8 ↑ | 88.6 | 0.1 |
| `16lL` — Paul Tol extended (L\*-Lab luminance adjusted) | 11.9 ↑ | 66.6 | 27.3 ↑ | 88.5 | 5.7 |
| `16h` — harmonic hue wheel | 4.6 | 130.4 | 4.6 | 64.8 | 0.1 |
| `16c` — high contrast | 29.1 | 92.2 | 29.3 | 72.0 | 0.0 |
| `16clH` — high contrast (HSL luminance adjusted) | 24.5 ↓ | 85.2 | 26.0 ↓ | 89.9 | 0.5 |
| `16clL` — high contrast (L\*-Lab luminance adjusted) | 25.9 ↓ | 84.8 | 38.7 ↑ | 88.1 | 5.7 |
| `16f` — final mix: hand-picked colors, Lab lightness, reordered | 23.2 ↓ | 90.2 | 43.8 ↑ | 91.5 | 0.9 |
| `16flH` — final mix (HSL luminance adjusted) | 20.6 ↓ | 83.0 | 26.1 ↓ | 93.9 | 0.5 |
| `16flL` — final mix (L\*-Lab luminance adjusted) | 21.4 ↓ | 85.5 | 35.3 ↓ | 88.2 | 5.7 |
| `16fa` — final mix, re-ordered (L\*-Lab luminance adjusted) | 19.6 ↓ | 86.9 | 70.1 ↑ | 88.1 | 5.6 |

↑ / ↓ mark the change against the base palette of that row (`16c` for `16f`,
`16f` for `16flH` / `16flL`, `16flL` for `16fa`); rows without a mark *are* base
palettes. The
lightness spread is a clear win for
`4`, `8` and `16` on both columns. `16c` is the exception: it is already tuned,
and forcing its colors onto a fixed lightness grid makes Brown ↔ Olive the
closest pair (ΔE 24.5 via `lH`, 25.9 via `lL`) where `16c`'s closest pair had
been Orange ↔ Brown (29.1). `lH` suffers most — it drops Brown and Olive onto the
*same* level (L\* 37.4 vs 36.9) — while `lL`'s grid keeps them a full level apart
(29.4 vs 35.3). Re-ordering cannot fix a *pair*, but it does give `16f` a much
better worst-triplet than `16c` (29.3 → 43.8); `16f`'s limit is triplet #11
(`Pink, Purple, Beige`), set by the low-chroma Pink ↔ Beige pair, while its
global closest pair is Smokey Black ↔ Dark Cyan (23.2). Spreading `16f` again
(`16flH` / `16flL`) *lowers* the worst triplet rather than raising it, and moves
it: `16flL`'s even Lab levels pull the gray down to 41.1 L\*, cutting Smokey
Black ↔ Funky Gray to 35.3 (triplet #6), while `16flH`'s worst lands on a light
triplet — #11 `Pink, Purple, Beige` at 26.1 — where Pink and Beige sit at 80.6
and 97.6 L\* with too little chroma between them; `16flH` also pays a 93.9 L\*
span and a 0.5 L\* gap. `16fa` shows what re-ordering alone is worth: the same
Lab-spread colors as `16flL`, merely rearranged, lift the worst triplet from
35.3 to 70.1. `16h` has the highest average pair distance of all (130.4) yet the
worst minimum (4.6), a reminder that average spacing says little about the
closest pair.

## Offline PNG export (optional)

`tools/generate_smileys.py` contains the same palettes and drawing code and exists
only for exporting PNGs (docs, comparisons, archival). It is the modular,
`argparse`-based evolution of the original template script.

```bash
pip install pillow
python3 tools/generate_smileys.py                                    # all, → ./out
python3 tools/generate_smileys.py --mode color                        # color only
python3 tools/generate_smileys.py --mode color --levels 8 16h --size 300
```

Grayscale triplets are written as 8-bit "L" PNGs (identical to the original
template), color triplets and all overviews as RGB PNGs. Each palette is written
as `<stem>_overview.png` plus `<stem>_trip<i>.png`.

## Notes

- Grayscale ramps use `round(i * 255 / (n - 1))`, identical in JS and Python,
  so both renderers agree on the gray values.
- The `lH` / `lL` sets are **derived at runtime** in `js/palettes.js` and
  re-derived by the same formulas in `tools/generate_smileys.py`; the two
  implementations produce byte-identical hex for all 360 palette values (the 6
  grayscale ramps plus the 17 color sets).
- The canvas renderer mirrors two PIL conventions so web app and exports line up:
  PIL draws `outline=..., width=n` *inward* from the shape boundary (canvas centres
  strokes, so paths are shrunk by `n/2`), and PIL uses integer division for the eye
  radius. What remains is antialiasing: PIL's `ImageDraw` does not antialias, so
  exported PNGs look very slightly harder-edged (differences are confined to 1px
  edges; verified pixel-by-pixel against the canvas output).
