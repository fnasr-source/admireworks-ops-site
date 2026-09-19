#!/usr/bin/env python3
"""
Canvas geometry, drawing helpers, and the build-time safety invariant for the
Basseqat static creative builds.

THE PROBLEM THIS SOLVES
-----------------------
build_v2.py hardcoded `S = 1080` and roughly sixty absolute pixel constants, so
it could only ever emit 1:1. The campaign-launch checklist records the result:
"NOT done. Render each regen at 1:1 + 4:5 + 9:16. Only 1:1 was produced this
session." Three sizes have been mandatory since the client-meta-renovation
skill was written and have never once shipped.

Worse, the v1 overlay script's geometry is actively wrong at the other two
sizes and would have shipped broken rather than failed loudly:
  * overlay_arabic_logo.py:125 puts the logo chip at y = W*0.05, i.e. rows
    54..265. A 4:5 gets center-cropped to 1:1 by several Meta placements,
    which removes rows 0..135, destroying ~40% of the chip.
  * overlay_arabic_logo.py:103 puts the headline baseline at H*0.855. At 4:5
    that lands at rows 1109..1217, past the square-safe floor of 1215. At 9:16
    it lands at row ~1642, deep inside the Reels bottom-35% dead zone.

So this module makes the canvas a first-class input AND makes safety a build
error rather than a discipline someone has to remember. Every text and logo
bbox is recorded as it is drawn, and assert_safe() fails the build if anything
escapes the safe band.

PHOTOGRAPHY BLEEDS FULL-BLEED. Only text and the logo obey `safe`.
"""

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

import lib_fonts as FNT

BRAND = Path("/Users/user/Documents/IDE Projects/Basseqat/apps/web/public/brand")

# Basseqat Brand Identity Guideline v1.0 (2026), approved by Khaled Nasseredin.
CREAM = (255, 248, 239)   # #FFF8EF
FOREST = (23, 87, 52)     # #175734
TERRA = (191, 121, 85)    # #BF7955
INK = (34, 44, 38)
HAIRLINE = (226, 214, 199)
MUTED = (120, 108, 96)

# clients/Basseqat/brand/visual-identity.md:200 -> "Digital: 120px width minimum".
# NOTE: the 75px/50px figures quoted in the repo CLAUDE.md are NOT in the brand
# book. 120 is the real floor and this is what the build asserts.
LOGO_MIN_PX = 120


@dataclass(frozen=True)
class Canvas:
    key: str
    W: int
    H: int
    safe_top: int
    safe_bottom: int
    inset_l: int
    inset_r: int
    head_lo: int          # headline band, top
    head_hi: int          # headline band, bottom

    @property
    def safe_w(self) -> int:
        return self.W - self.inset_l - self.inset_r

    @property
    def right(self) -> int:
        """RTL text anchors here."""
        return self.W - self.inset_r

    @property
    def center_x(self) -> int:
        """
        Centre of the SAFE BOX, not of the canvas.

        These differ at 9:16, where inset_r is 120 (the Reels icon rail) against
        inset_l of 65. Centring on W//2 there pushes a wide line off the safe
        right edge, which assert_safe() correctly rejects. Always centre on this.
        """
        return (self.inset_l + (self.W - self.inset_r)) // 2


# 1:1 -- 6% inset on all sides.
SQ = Canvas("1x1", 1080, 1080, 65, 1015, 65, 65, 620, 940)

# 4:5 -- THE SQUARE-SAFE RULE. Meta placements and the Ads Manager mockup
# center-crop 1080x1350 to 1:1, cutting 135px off the top and 135px off the
# bottom. The surviving square is rows 135..1215; the 6% inset applies inside
# THAT, giving rows 200..1150. Every glyph, rule, chip and logo pixel lives here.
FD = Canvas("4x5", 1080, 1350, 200, 1150, 65, 65, 700, 1100)

# 9:16 -- Reels/Stories chrome: top ~14% (270px) carries the profile row,
# the bottom ~35% (from y=1248) carries caption + CTA + action rail, and the
# right ~120px carries the icon column.
ST = Canvas("9x16", 1080, 1920, 270, 1248, 65, 120, 760, 1160)

ALL_CANVASES = {c.key: c for c in (SQ, FD, ST)}


def split_axis(cv: Canvas) -> str:
    """
    Split cards (ownership, expat) divide left/right at 1:1 and 4:5. At 9:16 a
    vertical divider would give two 540x1920 slivers, so the split rotates to
    top/bottom and the labels re-stack.
    """
    return "y" if cv.key == "9x16" else "x"


def max_rows(cv: Canvas, base: int) -> int:
    """Row-count budget for list cards. 4:5 has the TIGHTEST usable band
    (950px between safe_top and safe_bottom), not the loosest."""
    return {"1x1": base, "4x5": base, "9x16": base + 1}[cv.key]


# ------------------------------------------------------------------ image utils

def load(p) -> Image.Image:
    return Image.open(p).convert("RGB")


def cover(img: Image.Image, w: int, h: int, zoom: float = 1.0,
          ax: float = 0.5, ay: float = 0.5) -> Image.Image:
    """Cover-crop to exactly w x h with an anchor. ay=0.0 top-crops."""
    iw, ih = img.size
    scale = max(w / iw, h / ih) * zoom
    nw, nh = int(iw * scale + 0.5), int(ih * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = max(0, min(int((nw - w) * ax), nw - w))
    top = max(0, min(int((nh - h) * ay), nh - h))
    return img.crop((left, top, left + w, top + h))


def grade(img: Image.Image, contrast=1.05, color=1.06, bright=1.01, sharp=1.06) -> Image.Image:
    img = ImageEnhance.Contrast(img).enhance(contrast)
    img = ImageEnhance.Color(img).enhance(color)
    img = ImageEnhance.Brightness(img).enhance(bright)
    return ImageEnhance.Sharpness(img).enhance(sharp)


def scrim(canvas: Image.Image, start_frac: float = 0.55, feather_frac: float = 0.28,
          rgb=(26, 24, 20), amax: int = 168, side: str = "bottom") -> None:
    """
    Gradient scrim so headline text stays legible over photography.

    KEEP amax LOW. On this brand the photograph IS the argument: the whole
    campaign answers «هل ده حقيقي؟», so a scrim heavy enough to crush the grove
    into a dark green wash defeats the creative. 235 (the v2 value) does exactly
    that. Around 160-175 holds white type at 88px while the palms stay readable.

    `side` picks which edge the scrim grows from: cards with the headline at the
    top (the order-of-operations timeline) need it at the top, not the bottom.
    """
    W, H = canvas.size
    col = np.zeros(H, np.float64)
    feather = max(1, int(H * feather_frac))

    if side == "bottom":
        top = int(H * start_frac)
        for y in range(H):
            col[y] = 0.0 if y < top - feather else min(1.0, (y - (top - feather)) / feather)
    else:
        bot = int(H * start_frac)
        for y in range(H):
            col[y] = 0.0 if y > bot + feather else min(1.0, ((bot + feather) - y) / feather)

    alpha = np.clip(col * amax, 0, 255).astype(np.uint8)[:, None].repeat(W, axis=1)
    layer = Image.new("RGBA", (W, H), (*rgb, 0))
    layer.putalpha(Image.fromarray(alpha, "L"))
    canvas.alpha_composite(layer)


def band_luminance(img: Image.Image, y0: float, y1: float) -> float:
    """Mean luminance of a horizontal band, for choosing text polarity."""
    W, H = img.size
    crop = img.convert("RGB").crop((0, int(H * y0), W, int(H * y1)))
    a = np.asarray(crop).astype(np.float64)
    return float((0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]).mean())


# ----------------------------------------------------------------- the Ink proxy

class Ink:
    """
    Proxy around ImageDraw that records the bbox of every text and logo it draws,
    so assert_safe() can fail the build when something escapes the safe band.

    Only text and logo are recorded. Photography and full-bleed fills are
    deliberately exempt: they are supposed to run off the edges.
    """

    def __init__(self, canvas: Image.Image, cv: Canvas):
        self.canvas = canvas
        self.cv = cv
        self.d = ImageDraw.Draw(canvas)
        self.marks: list[tuple[str, tuple[int, int, int, int], str]] = []

    # -- passthroughs that are NOT bounds-checked (backgrounds, rules, chips) --
    def rectangle(self, *a, **k):
        return self.d.rectangle(*a, **k)

    def rounded_rectangle(self, *a, **k):
        return self.d.rounded_rectangle(*a, **k)

    def ellipse(self, *a, **k):
        return self.d.ellipse(*a, **k)

    def line(self, *a, **k):
        return self.d.line(*a, **k)

    def textlength(self, *a, **k):
        # ARABIC_FEATURES disables Madani's broken `kern` (see lib_fonts). It has
        # to be applied to MEASUREMENT as well as drawing: a width measured with
        # kern and a glyph run drawn without it would mis-place every right-
        # aligned line and silently defeat assert_safe().
        k.setdefault("features", FNT.ARABIC_FEATURES)
        return self.d.textlength(*a, **k)

    # -------------------------------- recorded draws --------------------------
    def text(self, xy, s, font, fill, label: str = "", **k):
        k.setdefault("features", FNT.ARABIC_FEATURES)
        bbox = self.d.textbbox(xy, s, font=font, **k)
        self.marks.append(("text", tuple(int(v) for v in bbox), label or s[:28]))
        return self.d.text(xy, s, font=font, fill=fill, **k)

    def text_rtl(self, right_x: int, y: int, s: str, font, fill, label: str = ""):
        """Draw one line right-aligned at right_x. RTL default for this brand."""
        w = self.textlength(s, font=font)
        return self.text((right_x - w, y), s, font, fill, label=label)

    def text_center(self, cx: int, y: int, s: str, font, fill, label: str = ""):
        w = self.textlength(s, font=font)
        return self.text((cx - w / 2, y), s, font, fill, label=label)

    def record_logo(self, box: tuple[int, int, int, int]):
        self.marks.append(("logo", tuple(int(v) for v in box), "logo"))

    def record_panel(self, box: tuple[int, int, int, int], label: str = "panel"):
        """
        Filled blocks that are composited over earlier content (the bottom bar,
        comparison panels). Recorded so assert_safe can catch them swallowing
        text drawn before them, which is the same defect class as the logo chip
        erasing the hamza of «أرض».
        """
        self.marks.append(("panel", tuple(int(v) for v in box), label))


class SafeZoneError(AssertionError):
    pass


def assert_safe(cv: Canvas, ink: Ink) -> None:
    """
    Fail the build if any recorded text or logo escapes the canvas safe band,
    or if the logo is under the brand-book minimum width.

    This is the single highest-leverage structural change versus v2, which had
    no such check and therefore shipped 1:1 only, by accident rather than design.
    """
    problems = []

    # Glyph ink can extend a pixel or two past the advance width (antialiasing,
    # and swashes on some Madani terminals), so a bbox that touches the safe edge
    # is not a real violation. The safe band already carries 65px of margin; this
    # tolerance only forgives sub-pixel overhang, not layout mistakes.
    TOL = 2

    # Collision check. The logo chip is composited AFTER the text, so an overlap
    # does not merely look crowded, it PAINTS OVER the glyphs: on the first build
    # the cream chip erased the hamza of «أرض» and the dot of its ض, turning the
    # word into «ارص». Both boxes were individually inside the safe band, so a
    # bounds-only check passed it. Overlap has to be its own assertion.
    # `marks` is in DRAW ORDER, and that ordering is the whole point: a filled
    # block only destroys text that was drawn BEFORE it. Text drawn after sits on
    # top and is intended (a bar's own label lives inside the bar). So compare
    # each cover only against earlier text.
    for i, (kind, cbox, clabel) in enumerate(ink.marks):
        if kind not in ("logo", "panel"):
            continue
        for tkind, tbox, tlabel in ink.marks[:i]:
            if tkind != "text":
                continue
            if (cbox[0] < tbox[2] and tbox[0] < cbox[2]
                    and cbox[1] < tbox[3] and tbox[1] < cbox[3]):
                problems.append(
                    f"{kind} '{clabel}' {cbox} is composited over earlier text "
                    f"'{tlabel}' {tbox} on {cv.key} and will erase it."
                )

    for kind, (x0, y0, x1, y1), label in ink.marks:
        if y0 < cv.safe_top - TOL or y1 > cv.safe_bottom + TOL:
            problems.append(
                f"{kind} '{label}' spans rows {y0}..{y1}, outside safe band "
                f"{cv.safe_top}..{cv.safe_bottom} on {cv.key}"
            )
        if x0 < cv.inset_l - TOL or x1 > cv.W - cv.inset_r + TOL:
            problems.append(
                f"{kind} '{label}' spans cols {x0}..{x1}, outside safe columns "
                f"{cv.inset_l}..{cv.W - cv.inset_r} on {cv.key}"
            )
        if kind == "logo" and (x1 - x0) < LOGO_MIN_PX:
            problems.append(
                f"logo is {x1 - x0}px wide, under the brand-book minimum of "
                f"{LOGO_MIN_PX}px (visual-identity.md:200) on {cv.key}"
            )
    if problems:
        raise SafeZoneError(
            f"{len(problems)} safe-zone violation(s) on {cv.key}:\n  - "
            + "\n  - ".join(problems)
        )


# ------------------------------------------------------------------ composition

def fit_font(ink: Ink, text: str, font_fn, start: int, min_size: int, max_w: int):
    """Shrink from `start` until the line fits max_w. Returns the font."""
    size = start
    f = font_fn(size)
    while ink.textlength(text, font=f) > max_w and size > min_size:
        size -= 4
        f = font_fn(size)
    return f


def wrap_rtl(ink: Ink, text: str, font, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if ink.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def logo_chip(canvas: Image.Image, ink: Ink, cv: Canvas, corner: str = "tl",
              logo_w: int | None = None, cream_chip: bool = True) -> tuple[int, int, int, int]:
    """
    Composite the compact Arabic lockup on a rounded cream chip.

    The chip is what guarantees contrast. Never swap the logo to a cream variant
    based on the background instead: on a mixed background that fails silently.
    Position is clamped INSIDE the canvas safe band, which is what stops the
    v1 bug where the chip was half-eaten by the 4:5 square crop.
    """
    lg = Image.open(BRAND / "logo-arabic.png").convert("RGBA")
    target = logo_w or max(LOGO_MIN_PX + 20, int(cv.W * 0.17))
    lg = lg.resize((target, int(lg.height * target / lg.width)), Image.LANCZOS)

    pad = int(target * 0.14)
    chip_w, chip_h = lg.width + 2 * pad, lg.height + 2 * pad

    if corner in ("tl", "bl"):
        mx = cv.inset_l
    else:
        mx = cv.W - cv.inset_r - chip_w
    my = cv.safe_top if corner in ("tl", "tr") else cv.safe_bottom - chip_h

    if cream_chip:
        mask = Image.new("L", (chip_w, chip_h), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, chip_w, chip_h), radius=pad, fill=255)
        solid = Image.new("RGBA", (chip_w, chip_h), (*CREAM, 228))
        solid.putalpha(mask)
        canvas.alpha_composite(solid, (mx, my))

    canvas.alpha_composite(lg, (mx + pad, my + pad))
    box = (mx, my, mx + chip_w, my + chip_h)
    ink.record_logo(box)
    return box


def rounded_photo(canvas: Image.Image, img: Image.Image, box: tuple[int, int, int, int],
                  radius: int = 22) -> None:
    x0, y0, x1, y1 = box
    photo = grade(cover(img, x1 - x0, y1 - y0))
    mask = Image.new("L", photo.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, photo.width, photo.height), radius=radius, fill=255)
    canvas.paste(photo, (x0, y0), mask)


def proof_overlay(canvas: Image.Image, cv: Canvas) -> Image.Image:
    """
    Render the unsafe regions as translucent red so a human can see at a glance
    that nothing important is sitting in them. Emitted by build_v3 --proof.
    """
    out = canvas.convert("RGBA").copy()
    layer = Image.new("RGBA", out.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    red = (220, 40, 40, 70)
    d.rectangle((0, 0, cv.W, cv.safe_top), fill=red)
    d.rectangle((0, cv.safe_bottom, cv.W, cv.H), fill=red)
    d.rectangle((0, cv.safe_top, cv.inset_l, cv.safe_bottom), fill=red)
    d.rectangle((cv.W - cv.inset_r, cv.safe_top, cv.W, cv.safe_bottom), fill=red)
    out.alpha_composite(layer)
    return out.convert("RGB")


def as_square_crop(canvas: Image.Image) -> Image.Image:
    """
    Simulate what Meta placements do to a 4:5: center-crop it to 1:1.

    The portal does NOT do this (campaign-reviews/[id]/page.tsx:781 renders
    width:100% with no object-fit), so a reviewer cannot see the crop risk
    unless we render it for them. This is that render.
    """
    W, H = canvas.size
    if H <= W:
        return canvas
    top = (H - W) // 2
    return canvas.crop((0, top, W, top + W))


def fit_rows(ink: "Ink", n: int, y_top: int, y_bot: int, font_fn,
             start: int = 38, min_size: int = 24, lead: float = 2.35):
    """
    Choose a row font size and row height so that `n` rows actually fit between
    y_top and y_bot.

    v2's list cards used a fixed row height with a floor, which silently
    overflowed into whatever was pinned below (the bottom bar), and nothing
    caught it because a bounds check only looks at the canvas edges. Fitting
    first, then asserting, is the order that holds.
    """
    avail = y_bot - y_top
    size = start
    while size > min_size and int(size * lead) * n > avail:
        size -= 2
    row_h = min(int(avail / n), int(size * lead) + 26)
    return font_fn(size), max(row_h, int(size * 1.5))
