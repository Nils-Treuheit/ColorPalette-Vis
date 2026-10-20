#!/usr/bin/env python3
"""Generate smiley PNGs — offline counterpart of the web app.

The web app (index.html) renders the same smileys client-side with canvas, so
this script is only needed to export PNG files (docs, comparison, archival).

Usage:
    python tools/generate_smileys.py
    python tools/generate_smileys.py --mode color --levels 8 16h --out /tmp/smileys
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Iterator

from PIL import Image, ImageDraw

BASE_SIZE = 150
MODES = ("gray", "color")

RGB = tuple[int, int, int]


# --- colour helpers ---------------------------------------------------------


def _hex(value: str) -> RGB:
    value = value.lstrip("#")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def _gray(value: int) -> RGB:
    return (value, value, value)


def _gray_ramp(n: int) -> list[RGB]:
    """Evenly spaced n-level ramp from 0..255."""
    return [_gray(int(round(i * 255 / (n - 1)))) for i in range(n)]


# --- palette data (mirrors js/palettes.js) ---------------------------------

# Color-safe categorical sets, hex values as specified.
HIGH_CONTRAST4 = ["#0072B2", "#E69F00", "#009E73", "#D55E00"]
WONG8 = [
    "#000000", "#E69F00", "#56B4E9", "#009E73",
    "#F0E442", "#0072B2", "#D55E00", "#CC79A7",
]
TOL16 = [
    "#332288", "#88CCEE", "#44AA99", "#117733",
    "#999933", "#DDCC77", "#CC6677", "#882255",
    "#AA4499", "#661100", "#6699CC", "#AA4466",
    "#998811", "#661155", "#FFAABB", "#777777",
]
HARMONIC16 = [
    (255, 0, 0), (255, 64, 0), (255, 128, 0), (255, 192, 0),
    (255, 255, 0), (192, 255, 0), (0, 255, 0), (0, 255, 128),
    (0, 255, 255), (0, 128, 255), (0, 0, 255), (64, 0, 255),
    (128, 0, 255), (255, 0, 255), (255, 0, 192), (255, 0, 128),
]
CONTRAST16 = [
    (230, 25, 75), (60, 180, 75), (255, 215, 0), (0, 130, 200),
    (245, 130, 48), (145, 30, 180), (70, 240, 240), (240, 50, 230),
    (0, 255, 0), (255, 192, 203), (0, 128, 128), (181, 126, 220),
    (170, 110, 40), (255, 250, 200), (128, 0, 0), (128, 128, 0),
]


# --- lightness-spread variants (lH = HSL L, lL = Lab L*) --------------------
#
# A base palette re-encoded by rewriting ONLY the lightness channel:
#   "lH" sets it in HSL (keeping hue and saturation),
#   "lL" sets CIE Lab L* (keeping the hue angle; chroma is reduced only where
#        the result would fall outside the sRGB gamut).
# For n colours the levels are the inner n of n+2 evenly spaced values, so 0%
# and 100% are deliberately left out — 4 colours aim at 20/40/60/80%.
# Colours are assigned to levels by their original lightness (darkest colour
# gets the darkest level) and keep their position in the palette.
# Mirrors spreadLightness() in js/palettes.js.

LAB_EPS = 216 / 24389
LAB_KAPPA = 24389 / 27


def _to_rgb(color: str | RGB) -> RGB:
    return _hex(color) if isinstance(color, str) else color


def _clamp01(v: float) -> float:
    return 0.0 if v < 0 else 1.0 if v > 1 else v


def _round255(v: float) -> int:
    """Scale a 0..1 value to a byte; rounds half up, like JS Math.round."""
    return max(0, min(255, int(math.floor(v * 255 + 0.5))))


def _light_levels(n: int) -> list[float]:
    """Target lightness levels (%) for n colours: the inner n of n+2."""
    return [100 * (i + 1) / (n + 1) for i in range(n)]


def _rgb_to_hsl(rgb: RGB) -> tuple[float, float, float]:
    r, g, b = (c / 255 for c in rgb)
    mx, mn = max(r, g, b), min(r, g, b)
    light = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, light * 100
    d = mx - mn
    s = d / (2 - mx - mn) if light > 0.5 else d / (mx + mn)
    if mx == r:
        h = ((g - b) / d + 6) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60, s * 100, light * 100


def _hsl_to_rgb(h: float, s: float, light: float) -> RGB:
    hh = ((h % 360) + 360) % 360 / 360
    ss = s / 100
    ll = light / 100
    if ss == 0:
        v = _round255(ll)
        return (v, v, v)
    q = ll * (1 + ss) if ll < 0.5 else ll + ss - ll * ss
    p = 2 * ll - q

    def f(t: float) -> float:
        if t < 0:
            t += 1
        elif t > 1:
            t -= 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    return (_round255(f(hh + 1 / 3)), _round255(f(hh)), _round255(f(hh - 1 / 3)))


def _srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _linear_to_srgb(c: float) -> float:
    return c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def _rgb_to_lab(rgb: RGB) -> tuple[float, float, float]:
    r, g, b = (_srgb_to_linear(c / 255) for c in rgb)
    x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
    y = r * 0.2126729 + g * 0.7151522 + b * 0.072175
    z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > LAB_EPS else (841 / 108) * t + 4 / 29

    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def _lab_to_linear(L: float, a: float, b: float) -> tuple[float, float, float]:
    fy = (L + 16) / 116
    fx = fy + a / 500
    fz = fy - b / 200

    def finv(t: float) -> float:
        t3 = t ** 3
        return t3 if t3 > LAB_EPS else (116 * t - 16) / LAB_KAPPA

    x = finv(fx) * 0.95047
    y = finv(fy)
    z = finv(fz) * 1.08883
    return (
        x * 3.2404542 + y * -1.5371385 + z * -0.4985314,
        x * -0.969266 + y * 1.8760108 + z * 0.041556,
        x * 0.0556434 + y * -0.2040259 + z * 1.0572252,
    )


def _lab_to_rgb(L: float, a: float, b: float) -> RGB:
    """Lab -> RGB, shrinking chroma until the colour fits the sRGB gamut."""
    chroma0 = math.sqrt(a * a + b * b)
    h = math.atan2(b, a)

    def fits(c: float) -> bool:
        return all(
            -1e-9 <= v <= 1 + 1e-9
            for v in _lab_to_linear(L, c * math.cos(h), c * math.sin(h))
        )

    chroma = chroma0
    if not fits(chroma):
        lo, hi = 0.0, chroma0
        for _ in range(60):
            mid = (lo + hi) / 2
            if fits(mid):
                lo = mid
            else:
                hi = mid
        chroma = lo
    r, g, b = _lab_to_linear(L, chroma * math.cos(h), chroma * math.sin(h))
    return (
        _round255(_linear_to_srgb(_clamp01(r))),
        _round255(_linear_to_srgb(_clamp01(g))),
        _round255(_linear_to_srgb(_clamp01(b))),
    )


def spread_lightness(colors: list[str | RGB], space: str) -> list[RGB]:
    """Rewrite only the lightness channel of every colour of a base palette.

    space 'H' uses HSL lightness, 'L' uses CIE Lab L*. Every colour keeps its
    hue (and saturation / chroma) and is assigned to one of the `_light_levels`
    by its original lightness — darkest colour gets the darkest level — while
    keeping its position in the palette.
    """
    rgbs = [_to_rgb(c) for c in colors]
    keys = [_rgb_to_hsl(c)[2] if space == "H" else _rgb_to_lab(c)[0] for c in rgbs]
    order = sorted(range(len(rgbs)), key=lambda i: (keys[i], i))
    levels = _light_levels(len(rgbs))
    derived: dict[int, RGB] = {}
    for rank, idx in enumerate(order):
        target = levels[rank]
        if space == "H":
            h, s, _ = _rgb_to_hsl(rgbs[idx])
            derived[idx] = _hsl_to_rgb(h, s, target)
        else:
            _, a, b = _rgb_to_lab(rgbs[idx])
            derived[idx] = _lab_to_rgb(target, a, b)
    return [derived[i] for i in range(len(rgbs))]


BLUISH_GREEN = "#009E73"  # substitutes Green in the final 16-colour set
STRAWBERRY_RED = "#E61224"  # the final set's red
PEPPERMINT_TOAD = "#009933"  # the final set's green (replaces Bluish Green)
AMBER_GOLD = "#EECA00"  # the final set's gold
ROYAL_BLUE = "#4169E1"  # the final set's blue
ELECTRIC_LASER_LIME = "#1AFF2E"  # the final set's lime
FUNKY_GRAY = "#777777"  # the final set's neutral (olive slot)
SMOKEY_BLACK = "#0F0807"  # the final set's darkest colour (maroon slot)

# New index -> original 16c index for the final set. Reads, in order: Orange,
# Royal Blue, Peppermint Toad, Amber Gold, Magenta, Cyan, Smokey Black,
# Strawberry Red, Funky Gray, Electric Laser Lime, Brown, Pink, Purple, Beige,
# Lavender, Dark Cyan.
FINAL16_ORDER = [4, 3, 1, 2, 7, 6, 14, 0, 15, 8, 12, 9, 5, 13, 11, 10]

# `16fa` — a frozen snapshot of `16f`'s Lab L* spread (the `16flL` coding) as
# it stood before the Funky Gray / Smokey Black rework, arranged in the order
# that maximises the worst neighbouring triplet.
FINAL16_ALT = [
    "#D99DA8", "#DCBB00", "#00ED25", "#454545",
    "#C5001B", "#C800C0", "#003131", "#F5F0BE",
    "#004CBA", "#250C00", "#009331", "#AD77D4",
    "#F07E2C", "#88EEEE", "#39004B", "#543000",
]


def final_sixteen() -> list[RGB]:
    """The final 16-colour set `16f`.

    Bluish Green substitutes Green in 16c, the lightness is then spread in Lab
    L* (the 16clL rule), eight colours are then replaced by hand — cyan taken
    from 16clH, and Strawberry Red, Peppermint Toad, Amber Gold, Royal Blue,
    Electric Laser Lime, Funky Gray and Smokey Black picked outright — and the
    colours are re-ordered by FINAL16_ORDER.
    """
    base: list[str | RGB] = list(CONTRAST16)
    base[1] = BLUISH_GREEN
    colors = spread_lightness(base, "L")
    hsl = spread_lightness(CONTRAST16, "H")
    colors[0] = _hex(STRAWBERRY_RED)  # red
    colors[1] = _hex(PEPPERMINT_TOAD)  # green
    colors[2] = _hex(AMBER_GOLD)  # gold
    colors[3] = _hex(ROYAL_BLUE)  # blue
    colors[6] = hsl[6]  # Cyan (the one colour still taken from 16clH)
    colors[8] = _hex(ELECTRIC_LASER_LIME)  # lime
    colors[14] = _hex(SMOKEY_BLACK)  # maroon slot -> smokey black
    colors[15] = _hex(FUNKY_GRAY)  # olive slot -> funky gray
    return [colors[i] for i in FINAL16_ORDER]


def sets(mode: str) -> dict[str, list[RGB]]:
    """Palette label -> colours, for one mode. Labels match the web app."""
    if mode == "gray":
        return {
            "4": [_gray(v) for v in (0, 85, 170, 255)],
            "8": [_gray(v) for v in (0, 36, 73, 110, 146, 182, 219, 255)],
            "16": _gray_ramp(16),
            "24": _gray_ramp(24),
            "32": _gray_ramp(32),
            "64": _gray_ramp(64),
        }
    if mode == "color":
        final = final_sixteen()
        return {
            "4": [_hex(c) for c in HIGH_CONTRAST4],
            "4lH": spread_lightness(HIGH_CONTRAST4, "H"),
            "4lL": spread_lightness(HIGH_CONTRAST4, "L"),
            "8": [_hex(c) for c in WONG8],
            "8lH": spread_lightness(WONG8, "H"),
            "8lL": spread_lightness(WONG8, "L"),
            "16": [_hex(c) for c in TOL16],
            "16lH": spread_lightness(TOL16, "H"),
            "16lL": spread_lightness(TOL16, "L"),
            "16h": list(HARMONIC16),
            "16c": list(CONTRAST16),
            "16clH": spread_lightness(CONTRAST16, "H"),
            "16clL": spread_lightness(CONTRAST16, "L"),
            "16f": final,
            "16flH": spread_lightness(final, "H"),
            "16flL": spread_lightness(final, "L"),
            "16fa": [_hex(c) for c in FINAL16_ALT],
        }
    raise ValueError(f"Unknown mode: {mode}")


def triplets(mode: str, label: str) -> Iterator[tuple[int, RGB, RGB, RGB]]:
    """Neighboring triplet combinations (i, i+1, i+2).

    Yields (index, face, feature, outline); the first three for 8 colours are
    (0, c0, c1, c2), (1, c1, c2, c3), (2, c2, c3, c4).
    """
    colors = sets(mode)[label]
    for i in range(len(colors) - 2):
        yield i, colors[i], colors[i + 1], colors[i + 2]


# --- rendering --------------------------------------------------------------


def contrast_color(colors: list[RGB]) -> RGB:
    """The palette colour that differs most from all the others (first on ties)."""

    def dist2(a: RGB, b: RGB) -> int:
        return sum((x - y) ** 2 for x, y in zip(a, b))

    return max(colors, key=lambda c: sum(dist2(c, o) for o in colors))


def draw_smiley(
    face_color: RGB,
    feature_color: RGB,
    outline_color: RGB,
    size: int = BASE_SIZE,
) -> Image.Image:
    """Render a smiley using 3 distinct palette colours.

    Grayscale triplets produce an "L" image (as in the original template),
    color triplets an "RGB" image.
    """
    is_gray = all(c[0] == c[1] == c[2] for c in (face_color, feature_color, outline_color))
    to_pil = (lambda c: c[0]) if is_gray else (lambda c: c)
    img = Image.new("L" if is_gray else "RGB", (size, size), to_pil(face_color))
    draw = ImageDraw.Draw(img)

    # Outer border circle
    draw.ellipse([10, 10, size - 10, size - 10], outline=to_pil(outline_color), width=4)

    # Eyes
    eye_radius = size // 12
    for cx in (0.32, 0.68):
        draw.ellipse(
            [
                size * cx - eye_radius,
                size * 0.35 - eye_radius,
                size * cx + eye_radius,
                size * 0.35 + eye_radius,
            ],
            fill=to_pil(feature_color),
        )

    # Mouth (smile arc)
    draw.arc(
        [size * 0.25, size * 0.45, size * 0.75, size * 0.75],
        start=0,
        end=180,
        fill=to_pil(feature_color),
        width=4,
    )

    return img


def draw_overview(colors: list[RGB], size: int = BASE_SIZE) -> Image.Image:
    """The whole palette in one smiley: the face is a pie slice per colour
    (clockwise from 12 o'clock), border/eyes/mouth use the most distinct
    colour, the corners the last one."""
    contrast = contrast_color(colors)
    img = Image.new("RGB", (size, size), colors[-1])
    draw = ImageDraw.Draw(img)

    inset = 10 * (size / BASE_SIZE)
    box = [inset, inset, size - inset, size - inset]
    count = len(colors)
    for i, color in enumerate(colors):
        draw.pieslice(
            box,
            start=-90 + i * 360 / count,
            end=-90 + (i + 1) * 360 / count,
            fill=color,
        )

    draw.ellipse(box, outline=contrast, width=4)

    eye_radius = size // 12
    for cx in (0.32, 0.68):
        draw.ellipse(
            [
                size * cx - eye_radius,
                size * 0.35 - eye_radius,
                size * cx + eye_radius,
                size * 0.35 + eye_radius,
            ],
            fill=contrast,
        )

    draw.arc(
        [size * 0.25, size * 0.45, size * 0.75, size * 0.75],
        start=0,
        end=180,
        fill=contrast,
        width=4,
    )

    return img


def export(mode: str, label: str, out_dir: Path, size: int = BASE_SIZE) -> int:
    """Write the palette overview plus every neighboring triplet as PNG."""
    colors = sets(mode)[label]
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"smiley_palette{label}" if mode == "gray" else f"smiley_color{label}"

    draw_overview(colors, size).save(out_dir / f"{stem}_overview.png")
    count = 1
    for i, face, feature, outline in triplets(mode, label):
        draw_smiley(face, feature, outline, size).save(out_dir / f"{stem}_trip{i}.png")
        count += 1
    return count


# --- cli --------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--mode",
        choices=(*MODES, "both"),
        default="both",
        help="which palettes to export (default: both)",
    )
    parser.add_argument(
        "--levels",
        nargs="+",
        default=None,
        help="palette labels to export, e.g. --mode color --levels 8 16h (default: all)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("out"),
        help="output directory (default: ./out)",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=BASE_SIZE,
        help=f"image size in pixels (default: {BASE_SIZE})",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    modes = MODES if args.mode == "both" else (args.mode,)
    total = 0
    for mode in modes:
        available = sets(mode)
        labels = args.levels if args.levels else list(available)
        unknown = [label for label in labels if label not in available]
        if unknown:
            raise SystemExit(
                f"Unknown {mode} palette(s): {', '.join(unknown)}. "
                f"Available: {', '.join(available)}"
            )
        for label in labels:
            count = export(mode, label, args.out, args.size)
            total += count
            print(f"{mode:>5} {label:>3} -> {count:>2} images in {args.out}/")
    print(f"Done: {total} images total.")


if __name__ == "__main__":
    main()
