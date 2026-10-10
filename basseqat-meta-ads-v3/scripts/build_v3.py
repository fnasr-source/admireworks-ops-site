#!/usr/bin/env python3
"""
Build the Basseqat August-2026 static retargeting creatives.

  8 concepts x 3 ratios (1:1, 4:5, 9:16) = 24 PNGs.

WHAT IS DIFFERENT FROM build_v2.py
----------------------------------
1. NO AI IMAGERY AT ALL. generate_v2.mjs and every Vertex image model are out of
   this wave (client directive, 2026-08-04). Every pixel is a real photograph or
   a deterministic PIL card. Stage A of the old pipeline simply does not exist.

2. NO ARABIC LITERALS IN THIS FILE. build_v2.py hardcoded its on-image strings
   (lines 198, 209, 234, 331, 499...), which meant nothing ever linted the text
   that actually shipped on the image. Here every string comes from
   copy/copy-deck-v3.json, so linting the deck transitively lints the pixels.

3. THREE SIZES, ENFORCED. The key geometric insight: all three canvases are
   1080px wide and all three have a ~950-978px safe band. So the layout is
   authored ONCE inside a 1080 x ~950 "content box" and that box is simply
   placed at a different vertical offset per canvas, with photography bleeding
   full-bleed around it. Font sizes never need scaling. Multi-size stops being
   a rewrite and becomes an offset.

4. SAFETY IS A BUILD ERROR. lib_canvas.Ink records every text and logo bbox and
   assert_safe() fails the build if anything escapes the safe band or if the
   logo drops under the 120px brand-book minimum. v2 had no such check, which is
   why it silently shipped 1:1 only.

5. SOURCES ARE GATED BY HASH. lib_provenance.require_safe() recomputes the
   sha256 of every source image and refuses anything without an independent
   visual SAFE verdict. A prior "safe backgrounds" list in this repo was wrong on
   every entry; a filename list cannot be trusted, a hash ledger can.

Usage:
    python3 build_v3.py                       # everything
    python3 build_v3.py --only c19,c15
    python3 build_v3.py --size 1x1
    python3 build_v3.py --proof                # + safe-zone overlays and 4:5-as-square
    python3 build_v3.py --cards-only           # skip concepts still waiting on photos
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))

import lib_canvas as C
import lib_fonts as FNT
import lib_provenance as PROV
from lib_canvas import CREAM, FOREST, TERRA, INK, HAIRLINE, MUTED, Canvas, Ink

WAVE = Path(__file__).resolve().parent.parent
DECK_PATH = WAVE / "copy" / "copy-deck-v3.json"
OUT_DIR = WAVE / "assets" / "out"
PROOF_DIR = WAVE / "assets" / "proof"
WAVE_JSON = WAVE / "wave.json"

BRAND = Path("/Users/user/Documents/IDE Projects/Basseqat/apps/web/public/brand")


# --------------------------------------------------------------- layout helpers

def content_box(cv: Canvas) -> tuple[int, int, int, int]:
    """The one rectangle every text element must live inside."""
    return (cv.inset_l, cv.safe_top, cv.W - cv.inset_r, cv.safe_bottom)


def kicker_chip(ink: Ink, cv: Canvas, y: int, text: str, fg=CREAM, bg=TERRA) -> int:
    """Small pill above the hero line. Returns the y after it."""
    f = FNT.SEMI(34)
    w = ink.textlength(text, font=f)
    pad_x, pad_y = 26, 14
    x1 = cv.right
    x0 = x1 - w - 2 * pad_x
    ink.rounded_rectangle((x0, y, x1, y + f.size + 2 * pad_y), radius=18, fill=bg)
    ink.text((x0 + pad_x, y + pad_y - 4), text, f, fg, label="kicker")
    return y + f.size + 2 * pad_y


def hero(ink: Ink, cv: Canvas, y: int, text: str, fill, start=86, min_size=52,
         center=False) -> int:
    """The one line that has to stop the scroll. Wraps if it must."""
    box_w = cv.safe_w
    f = C.fit_font(ink, text, FNT.BOLD, start, min_size, box_w)
    lines = C.wrap_rtl(ink, text, f, box_w)
    for ln in lines:
        if center:
            ink.text_center(cv.center_x, y, ln, f, fill, label="hero")
        else:
            ink.text_rtl(cv.right, y, ln, f, fill, label="hero")
        y += int(f.size * 1.28)
    return y


def bar_top(ink: Ink, cv: Canvas, text: str) -> int:
    """Where the bottom bar will start. Callers lay out ABOVE this."""
    f = C.fit_font(ink, text, FNT.SEMI, 42, 28, cv.safe_w - 60)
    return cv.safe_bottom - (f.size + 46)


def bottom_bar(canvas: Image.Image, ink: Ink, cv: Canvas, text: str,
               bg=FOREST, fg=CREAM, bottom: int | None = None) -> int:
    """
    Full-safe-width bar pinned to the bottom of the safe band. Returns its top.

    `bottom` raises the bar off the safe floor so something else can sit under
    it. Only the photo concepts need that, to run the «من أرض الواقع» credit
    below the bar instead of squeezed above it.
    """
    bottom = cv.safe_bottom if bottom is None else bottom
    f = C.fit_font(ink, text, FNT.SEMI, 42, 28, cv.safe_w - 60)
    h = f.size + 46
    y0 = bottom - h
    ink.rounded_rectangle((cv.inset_l, y0, cv.W - cv.inset_r, bottom), radius=16, fill=bg)
    ink.record_panel((cv.inset_l, y0, cv.W - cv.inset_r, bottom), "bottombar")
    ink.text_center(cv.center_x, y0 + 20, text, f, fg, label="bottombar")
    return y0


PHOTO_LABEL_SIZE = 34  # was 27, raised on client note 2026-08-13 (thread AGSb20ydIFcswv9EqjEl)

CREDIT_INK = (243, 236, 227)
CREDIT_PILL = (26, 24, 20, 150)


def photo_label(ink: Ink, cv: Canvas, y: int, text: str, canvas: Image.Image,
                size: int = PHOTO_LABEL_SIZE) -> int:
    """
    The «من أرض الواقع» provenance credit, cream on a translucent dark pill.
    Returns the y it consumed to.

    THE PILL IS NOT DECORATION, and a luminance-polarity switch is not a
    substitute for it. This line lands on unscrimmed photography whose
    brightness sits right on the light/dark boundary: measured across the three
    canvases of the order-of-operations ad, the band under the credit reads
    143.5, 136.8 and 152.0. Any sane threshold therefore flips the credit's
    colour BETWEEN SIZES OF THE SAME AD, and on that particular band (the sand
    meeting the palm row) neither colour is legible anyway, because the problem
    is busyness rather than brightness.

    A fixed pill is deterministic across every canvas and every photograph, and
    it suits the element: «من أرض الواقع» is a provenance claim the brand wants
    read, not a caption to hide. Same reasoning as the fixed cream logo chip,
    which exists so the logo can never go cream-on-cream.
    """
    f = FNT.REG(size)
    tw = int(ink.textlength(text, font=f))
    pad_x, pad_y = 18, 9
    x1, y0 = cv.right, y - pad_y
    x0, y1 = x1 - tw - pad_x * 2, y + size + pad_y
    w, h = x1 - x0, y1 - y0

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=255)
    pill = Image.new("RGBA", (w, h), CREDIT_PILL)
    pill.putalpha(mask)
    canvas.alpha_composite(pill, (x0, y0))

    ink.text_rtl(cv.right - pad_x, y, text, f, CREDIT_INK, label="photolabel")
    return y1


def photo_base(cv: Canvas, img_path: Path, zoom=1.0, ax=0.5, ay=0.5) -> Image.Image:
    """
    Full-bleed photography. Note that ay is per-canvas: a frame composed for a
    landscape crop rarely survives a 9:16 crop, so callers pass different anchors.
    """
    img = C.load(PROV.require_safe(img_path))
    return C.grade(C.cover(img, cv.W, cv.H, zoom=zoom, ax=ax, ay=ay)).convert("RGBA")


def card_base(cv: Canvas, fill=CREAM) -> Image.Image:
    return Image.new("RGBA", (cv.W, cv.H), (*fill, 255))


# ------------------------------------------------------------------- 8 builders

def build_c19_six_questions(cv: Canvas, cc: dict, assets: dict) -> Image.Image:
    """Numbered question list. Arms the reader instead of asserting at them."""
    canvas = card_base(cv)
    ink = Ink(canvas, cv)
    e = cc["elements"]
    x0, y0, x1, y1 = content_box(cv)
    logo_box = C.logo_chip(canvas, ink, cv, corner="tl")

    y = logo_box[3] + 34
    y = kicker_chip(ink, cv, y, e["kicker"]) + 26
    y = hero(ink, cv, y, cc["onImageLine"], FOREST, start=76) + 14
    ink.rectangle((cv.right - 250, y, cv.right, y + 8), fill=TERRA)
    y += 40

    rows = e["rows"]
    top_of_bar = bar_top(ink, cv, e["footer"])
    f_row, row_h = C.fit_rows(ink, len(rows), y, top_of_bar - 22, FNT.SEMI,
                              start=38, min_size=24)
    f_num = FNT.BOLD(max(22, int(f_row.size * 0.78)))

    for i, row in enumerate(rows):
        cy = y + row_h // 2
        r = min(27, row_h // 3)
        cx = cv.right - r
        ink.ellipse((cx - r, cy - r, cx + r, cy + r), fill=FOREST)
        num = "١٢٣٤٥٦"[i]
        nw = ink.textlength(num, font=f_num)
        ink.text((cx - nw / 2, cy - f_num.size * 0.62), num, f_num, CREAM, label=f"num{i+1}")
        ink.text_rtl(cv.right - 2 * r - 26, cy - f_row.size * 0.68, row, f_row, INK, label=f"q{i+1}")
        y += row_h
        if i < len(rows) - 1:
            ink.line((x0, y - 2, x1, y - 2), fill=HAIRLINE, width=2)

    bottom_bar(canvas, ink, cv, e["footer"])
    C.assert_safe(cv, ink)
    return canvas


def build_c20_open_gate_pension(cv: Canvas, cc: dict, assets: dict) -> Image.Image:
    """Real photograph, scrim, the reader's own clock as the hero."""
    ay = {"1x1": 0.68, "4x5": 0.66, "9x16": 0.60}[cv.key]
    canvas = photo_base(cv, assets["photo"], zoom=1.06, ay=ay)
    C.scrim(canvas, start_frac=0.56, feather_frac=0.30, amax=172)
    ink = Ink(canvas, cv)
    e = cc["elements"]
    C.logo_chip(canvas, ink, cv, corner="tl")

    y = cv.head_lo
    y = hero(ink, cv, y, cc["onImageLine"], CREAM, start=88) + 12
    # Client note 2026-08-13: «ننزل هذا السطر الصغير تحت ونكبر الخط». The credit
    # used to sit ABOVE the CTA bar with about 10px of clearance, which read as a
    # cramped afterthought. It now runs UNDER the bar at the safe floor, larger
    # and at higher contrast, and the bar is raised to make room.
    credit_h = PHOTO_LABEL_SIZE + 16
    bottom_bar(canvas, ink, cv, e["bottomBar"], bg=TERRA, fg=CREAM,
               bottom=cv.safe_bottom - credit_h)
    photo_label(ink, cv, cv.safe_bottom - PHOTO_LABEL_SIZE - 8, e["photoLabel"], canvas)
    C.assert_safe(cv, ink)
    return canvas


def build_c21_built_what(cv: Canvas, cc: dict, assets: dict) -> Image.Image:
    """
    Choice -> consequence table.

    REBUILT 2026-08-05. The previous version put a headline about PLACE
    («بنيت هنا إيه؟») over a list about ASSET CLASSES, and listed three
    alternatives each with a downside while never showing the palm as a fourth
    option. So there was no positive pole and the comparison it was making was
    invisible. The native reviewer's exact words were «مش موضح الفكرة دي».
    Now: two labelled columns, four rows, and the fourth row IS Basseqat, set in
    forest so the eye lands on it last and hardest.
    """
    canvas = card_base(cv)
    ink = Ink(canvas, cv)
    e = cc["elements"]
    x0, y0, x1, y1 = content_box(cv)
    logo_box = C.logo_chip(canvas, ink, cv, corner="tl")

    y = logo_box[3] + 34
    y = kicker_chip(ink, cv, y, e["kicker"]) + 24
    y = hero(ink, cv, y, cc["onImageLine"], FOREST, start=72) + 26

    rows = e["rows"]
    top_of_bar = bar_top(ink, cv, e["bottomBar"])

    # Column headers, then a rule.
    f_head = FNT.SEMI(27)
    split = x0 + int(cv.safe_w * 0.44)          # choice column is narrower
    ink.text_rtl(cv.right, y, e["rightHeader"], f_head, MUTED, label="colhead-r")
    ink.text_rtl(split - 18, y, e["leftHeader"], f_head, MUTED, label="colhead-l")
    y += f_head.size + 14
    ink.line((x0, y, x1, y), fill=TERRA, width=3)
    y += 16

    f_row, row_h = C.fit_rows(ink, len(rows), y, top_of_bar - 20, FNT.SEMI,
                              start=34, min_size=22)
    f_choice = FNT.BOLD(f_row.size)
    # ONE size for the whole result column. Fitting each cell independently made
    # the longest row (the Basseqat one, which is also the row that matters) set
    # visibly smaller than the three it is being compared against, which reads as
    # the answer being whispered. Size to the longest cell, then use it for all.
    col_w = split - x0 - 24
    f_result = FNT.REG(max(20, f_row.size - 4))
    for _, _result in rows:
        f_result = C.fit_font(ink, _result, FNT.REG, f_result.size, 17, col_w)

    for i, (choice, result) in enumerate(rows):
        last = i == len(rows) - 1
        cy = y + (row_h - f_row.size) // 2
        if last:
            # The one option we are selling. Banded, not just bolded, so it
            # reads as the answer rather than a fourth complaint.
            band = (x0, y - 4, x1, y + row_h - 10)
            ink.rounded_rectangle(band, radius=14, fill=FOREST)
            ink.record_panel(band, "answer-row")
        ink.text_rtl(cv.right, cy, choice, f_choice,
                     CREAM if last else INK, label=f"choice{i}")
        ink.text_rtl(split - 18, cy, result, f_result,
                     (214, 232, 220) if last else MUTED, label=f"result{i}")
        y += row_h
        if not last and i < len(rows) - 1:
            ink.line((x0, y - 8, x1, y - 8), fill=HAIRLINE, width=2)

    bottom_bar(canvas, ink, cv, e["bottomBar"], bg=TERRA, fg=CREAM)
    C.assert_safe(cv, ink)
    return canvas


def build_c15_ownership_split(cv: Canvas, cc: dict, assets: dict) -> Image.Image:
    """
    Ownership comparison MATRIX.

    REBUILT 2026-08-05. The previous version was two panels each holding a
    header and one caption, so most of the card was dead space: «ديزاين فاضي
    خالص، مفروش أي حاجة». It answers the second most-asked question in the whole
    corpus (617 leads, never once covered by an ad), so the concept had to
    survive with real content in it. Now three labelled rows compared across two
    columns, so a reader gets the actual difference at a glance.

    At 9:16 the two columns would be 540px slivers, so the comparison rotates:
    the right column stacks above the left, each keeping its own row labels.
    """
    canvas = card_base(cv)
    ink = Ink(canvas, cv)
    e = cc["elements"]
    x0, y0, x1, y1 = content_box(cv)
    logo_box = C.logo_chip(canvas, ink, cv, corner="tl")

    y = logo_box[3] + 30
    y = kicker_chip(ink, cv, y, e["kicker"]) + 22
    y = hero(ink, cv, y, cc["onImageLine"], FOREST, start=80) + 24

    top_of_bar = bar_top(ink, cv, e["bottomBar"])
    labels = e["rowLabels"]
    f_lab = FNT.REG(24)
    f_head = FNT.BOLD(30)
    f_sub = FNT.SEMI(23)
    f_val = FNT.SEMI(27)

    def column(bx0, by0, bx1, by1, header, sub, values, dark):
        if dark:
            ink.rounded_rectangle((bx0, by0, bx1, by1), radius=18, fill=FOREST)
            ink.record_panel((bx0, by0, bx1, by1), "col-ours")
            h_fill, s_fill, v_fill = CREAM, (176, 209, 188), CREAM
        else:
            ink.rounded_rectangle((bx0, by0, bx1, by1), radius=18, fill=(243, 237, 227))
            ink.record_panel((bx0, by0, bx1, by1), "col-not-ours")
            h_fill, s_fill, v_fill = (108, 116, 110), MUTED, (86, 94, 88)
        cx = (bx0 + bx1) // 2
        inner = bx1 - bx0 - 36
        ty = by0 + 20
        f = C.fit_font(ink, header, FNT.BOLD, f_head.size, 21, inner)
        for ln in C.wrap_rtl(ink, header, f, inner)[:2]:
            ink.text_center(cx, ty, ln, f, h_fill, label="colhead")
            ty += int(f.size * 1.2)
        ink.text_center(cx, ty + 2, sub, f_sub, s_fill, label="colsub")
        ty += f_sub.size + 20
        step = (by1 - 16 - ty) / max(1, len(values))
        for j, val in enumerate(values):
            fv = C.fit_font(ink, val, FNT.SEMI, f_val.size, 18, inner)
            ink.text_center(cx, int(ty + j * step), val, fv, v_fill, label=f"val{j}")
        return ty, step

    if C.split_axis(cv) == "x":
        gap = 20
        # Row labels run down the middle gutter, so both columns read against them.
        gutter_w = 118
        mid_l = x0 + (cv.safe_w - gutter_w) // 2
        mid_r = mid_l + gutter_w
        ty, step = column(mid_r, y, x1, top_of_bar - 16,
                          e["rightHeader"], e["rightSub"], e["rightValues"], dark=False)
        column(x0, y, mid_l, top_of_bar - 16,
               e["leftHeader"], e["leftSub"], e["leftValues"], dark=True)
        for j, lab in enumerate(labels):
            ink.text_center((mid_l + mid_r) // 2, int(ty + j * step) + 2, lab, f_lab,
                            MUTED, label=f"rowlab{j}")
    else:
        gap = 18
        half = (top_of_bar - 16 - y - gap) // 2
        column(x0, y, x1, y + half,
               e["rightHeader"], e["rightSub"], e["rightValues"], dark=False)
        column(x0, y + half + gap, x1, top_of_bar - 16,
               e["leftHeader"], e["leftSub"], e["leftValues"], dark=True)

    bottom_bar(canvas, ink, cv, e["bottomBar"])
    C.assert_safe(cv, ink)
    return canvas


def build_c18_water(cv: Canvas, cc: dict, assets: dict) -> Image.Image:
    """
    Where the water comes from, as a DATA CARD.

    Two decisions behind this. First, the reviewer said salinity is a question
    almost nobody asks («سؤال مش منتشر»), and the data agrees: water is 2.6% of
    leads, rank 12 of 14. So the hero moved from «٢١٣ ppm» to the well depth,
    which answers the doubt people actually feel about farming a desert.

    Second, this used to be a photo card and is not any more. There is NO
    verified water-infrastructure photograph: the one candidate, the lined
    reservoir in DJI_0149, was blocked because a person stands beside the parked
    cars. Laying a depth figure over a photograph of palms implies the photo is
    evidence for the figure. It is not, and on a brand whose whole argument is
    «هل ده حقيقي؟» that is exactly the wrong shortcut. A card states the number
    as a claim we will document on request, which is what it actually is.
    """
    canvas = card_base(cv)
    ink = Ink(canvas, cv)
    e = cc["elements"]
    x0, y0, x1, y1 = content_box(cv)
    logo_box = C.logo_chip(canvas, ink, cv, corner="tl")

    y = logo_box[3] + 40
    y = hero(ink, cv, y, e["subLine"], MUTED, start=40, min_size=28) + 18

    # Number and unit share a baseline; the unit sits to the LEFT of the number,
    # which is where it belongs in an RTL reading order.
    f_num = FNT.BOLD(170)
    f_unit = FNT.SEMI(40)
    num_w = ink.textlength(cc["onImageLine"], font=f_num)
    ink.text_rtl(cv.right, y, cc["onImageLine"], f_num, FOREST, label="depth")
    ink.text_rtl(cv.right - num_w - 20, y + f_num.size - f_unit.size - 26,
                 e["unit"], f_unit, TERRA, label="unit")
    y += int(f_num.size * 1.06)
    ink.rectangle((cv.right - 260, y, cv.right, y + 8), fill=TERRA)
    y += 46

    f_chip = FNT.SEMI(31)
    _, chip_h = C.fit_rows(ink, len(e["chips"]), y, y1 - 20, FNT.SEMI,
                           start=f_chip.size, min_size=22)
    for i, chip in enumerate(e["chips"]):
        cy = y + (chip_h - f_chip.size) // 2
        r = 9
        ink.ellipse((cv.right - r * 2, cy + 12, cv.right, cy + 12 + r * 2), fill=TERRA)
        ink.text_rtl(cv.right - r * 2 - 22, cy, chip, f_chip, INK, label=f"chip{i}")
        y += chip_h
        if i < len(e["chips"]) - 1:
            ink.line((x0, y - 6, x1, y - 6), fill=HAIRLINE, width=2)

    C.assert_safe(cv, ink)
    return canvas


def build_c22_order(cv: Canvas, cc: dict, assets: dict) -> Image.Image:
    """
    Photo carrying an ORDERED timeline band, so the argument (order of
    operations) is visible rather than merely listed. Deliberately inverted from
    its predecessor C5, which was a card carrying a photo strip.
    NO SOLAR NODE. EVER. (Khaled, 2026-03-30.)
    """
    # FRAMED BELOW THE HORIZON, DELIBERATELY. Do not raise these back up.
    #
    # The old framing (zoom 2.20/2.10/2.45, ay ~0.56) put the far horizon across
    # the middle of the frame and magnified it. That horizon carries a row of
    # small, human-scale, genuinely ambiguous shapes: at native resolution one
    # of them reads equally well as a person in an orange garment under a sun
    # umbrella or as a pump assembly under a cover, and another as a leaning
    # panel or a wall corner in perspective. The source's provenance verdict is
    # still honest, it says the buildings sit "well outside every crop", but
    # that was written against a different crop. A hash ledger pins the FILE; it
    # cannot pin what a later framing chooses to show.
    #
    # The no-people rule exists so that "is that Ayman?" is a question we never
    # have to answer, and Khaled's solar rejection is standing. Adjudicating
    # blobs one by one cannot satisfy either. Excluding the horizon can.
    #
    # These values are chosen so all three canvases resolve to the SAME source
    # window, y 1840-2840 of 3000, which is near-field planted rows over sand
    # and holds no horizon at all. One verification therefore covers all three.
    ay = {"1x1": 0.92, "4x5": 0.92, "9x16": 0.92}[cv.key]
    zoom = {"1x1": 3.00, "4x5": 3.00, "9x16": 3.00}[cv.key]
    canvas = photo_base(cv, assets["photo"], zoom=zoom, ay=ay)
    C.scrim(canvas, start_frac=0.34, feather_frac=0.22, amax=176, side="top")
    ink = Ink(canvas, cv)
    e = cc["elements"]
    x0, y0, x1, y1 = content_box(cv)
    logo_box = C.logo_chip(canvas, ink, cv, corner="tl")

    y = logo_box[3] + 34
    y = kicker_chip(ink, cv, y, e["kicker"]) + 22
    y = hero(ink, cv, y, cc["onImageLine"], CREAM, start=74) + 26

    steps = e["timeline"]
    band_h = 52 * len(steps) + 40
    band_y0 = y1 - 96 - band_h
    ink.rounded_rectangle((x0, band_y0, x1, band_y0 + band_h), radius=20, fill=(*CREAM, 236))

    f_step = FNT.SEMI(33)
    sx = cv.right - 34
    sy = band_y0 + 22
    for i, step in enumerate(steps):
        last = i == len(steps) - 1
        col = TERRA if last else FOREST
        ink.ellipse((sx - 10, sy + 11, sx + 10, sy + 31), fill=col)
        ink.text_rtl(sx - 30, sy + 4, step, f_step if not last else FNT.BOLD(33),
                     col if last else INK, label=f"step{i}")
        if not last:
            ink.rectangle((sx - 3, sy + 31, sx + 3, sy + 52), fill=TERRA)
        sy += 52

    # Same credit treatment as c20: the client's «نكبر الخط» note was written on
    # the pension ad, but this is the same brand element on the other photo
    # concept, and leaving one at 34px and this one at 23px would just look like
    # a mistake.
    photo_label(ink, cv, band_y0 + band_h + 16, e["photoLabel"], canvas)
    C.assert_safe(cv, ink)
    return canvas


def build_c17_sharia(cv: Canvas, cc: dict, assets: dict) -> Image.Image:
    """
    The profit-share argument, as a chain.

    REBUILT 2026-08-05. The previous version stated a refusal («مفيش رقم محدد
    قبل الموسم») over an empty forest field, with the Sharia point demoted to a
    small outlined chip. The reviewer could not tell what it was for:
    «الديزاين نفسه مش موضح هو الهدف إيه». The argument only works if you can see
    the causal chain, so now it IS the chain: you share in the company that
    farms, we harvest and sell, your share is computed from what it sold for,
    and THAT is why no number is promised in advance. The conclusion step is
    terracotta so the eye lands on it.

    COMPLIANCE: the natural Arabic for this argument is «ربح ثابت», which is
    hard-banned. Every step is written around «رقم» / «حصة» instead. Do not let
    a copy editor 'improve' it back.
    """
    canvas = card_base(cv, fill=FOREST)
    ink = Ink(canvas, cv)
    e = cc["elements"]
    x0, y0, x1, y1 = content_box(cv)
    logo_box = C.logo_chip(canvas, ink, cv, corner="tl")

    y = logo_box[3] + 30
    y = kicker_chip(ink, cv, y, e["kicker"], fg=FOREST, bg=(226, 238, 230)) + 24
    y = hero(ink, cv, y, cc["onImageLine"], CREAM, start=72) + 30

    steps = e["chain"]
    f_band = FNT.REG(26)
    band_lines = C.wrap_rtl(ink, e["shariaBand"], f_band, cv.safe_w - 90)
    band_h = len(band_lines) * int(f_band.size * 1.3) + 36
    band_y0 = y1 - band_h

    f_step, step_h = C.fit_rows(ink, len(steps), y, band_y0 - 28, FNT.SEMI,
                                start=34, min_size=22)
    dot_x = cv.right - 20
    for i, step in enumerate(steps):
        last = i == len(steps) - 1
        col = TERRA if last else (150, 190, 166)
        cy = y + (step_h - f_step.size) // 2
        ink.ellipse((dot_x - 10, cy + 8, dot_x + 10, cy + 28), fill=col)
        if not last:
            ink.rectangle((dot_x - 2, cy + 28, dot_x + 2, y + step_h + 8), fill=(60, 116, 84))
        ink.text_rtl(dot_x - 30, cy, step,
                     FNT.BOLD(f_step.size) if last else f_step,
                     TERRA if last else CREAM, label=f"step{i}")
        y += step_h

    ink.rounded_rectangle((x0, band_y0, x1, y1), radius=14,
                          fill=None, outline=(150, 186, 164), width=2)
    ty = band_y0 + 18
    for ln in band_lines:
        ink.text_center(cv.center_x, ty, ln, f_band, (222, 238, 228), label="shariaband")
        ty += int(f_band.size * 1.3)

    C.assert_safe(cv, ink)
    return canvas


def build_c16_annual_fees(cv: Canvas, cc: dict, assets: dict) -> Image.Image:
    """
    Statement-style label -> value rows. Deliberately looks like a document
    because no document photograph exists anywhere in the client's media.
    """
    canvas = card_base(cv)
    ink = Ink(canvas, cv)
    e = cc["elements"]
    x0, y0, x1, y1 = content_box(cv)
    logo_box = C.logo_chip(canvas, ink, cv, corner="tl")

    y = logo_box[3] + 34
    y = kicker_chip(ink, cv, y, e["kicker"]) + 26
    y = hero(ink, cv, y, cc["onImageLine"], FOREST, start=88) + 36

    rows = e["rows"]
    top_of_bar = bar_top(ink, cv, e["bottomBar"])
    f_lab, row_h = C.fit_rows(ink, len(rows), y, top_of_bar - 24, FNT.SEMI,
                              start=34, min_size=24, lead=2.6)
    f_val = FNT.BOLD(f_lab.size)

    for i, (lab, val) in enumerate(rows):
        ink.text_rtl(cv.right, y + 14, lab, f_lab, INK, label=f"lab{i}")
        ink.text((x0, y + 14), val, f_val, TERRA, label=f"val{i}")
        y += row_h
        if i < len(rows) - 1:
            ink.line((x0, y - 26, x1, y - 24), fill=HAIRLINE, width=2)

    bottom_bar(canvas, ink, cv, e["bottomBar"])
    C.assert_safe(cv, ink)
    return canvas


BUILDERS = {
    "concept19-six-questions": (build_c19_six_questions, False),
    "concept20-open-gate-pension": (build_c20_open_gate_pension, True),
    "concept21-built-what-expat": (build_c21_built_what, False),
    "concept15-ownership-split": (build_c15_ownership_split, False),
    "concept18-water-213ppm": (build_c18_water, False),
    "concept22-order-of-operations": (build_c22_order, True),
    "concept17-sharia-participation": (build_c17_sharia, False),
    "concept16-annual-fees": (build_c16_annual_fees, False),
}

# Filled once the visual verification pass clears real photographs for the three
# photo concepts. Kept OUT of the builders so a missing asset is a clear,
# named failure rather than a mysterious traceback.
PHOTO_ASSETS: dict[str, dict] = {}
ASSETS_PATH = WAVE / "assets" / "source" / "assets.json"
if ASSETS_PATH.exists():
    PHOTO_ASSETS = {
        k: {kk: (WAVE / vv if not str(vv).startswith("/") else Path(vv)) for kk, vv in v.items()}
        for k, v in json.loads(ASSETS_PATH.read_text(encoding="utf-8")).items()
    }


# ------------------------------------------------------------------------ main

def sha256_bytes(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated concept ids or short keys (c19,c15)")
    ap.add_argument("--size", default="1x1,4x5,9x16")
    ap.add_argument("--proof", action="store_true", help="emit safe-zone overlays + 4:5-as-square crops")
    ap.add_argument("--cards-only", action="store_true", help="skip concepts that need a photograph")
    args = ap.parse_args()

    shaping = FNT.assert_shaping()
    deck = json.loads(DECK_PATH.read_text(encoding="utf-8"))
    deck_hash = hashlib.sha256(DECK_PATH.read_bytes()).hexdigest()

    sizes = [C.ALL_CANVASES[s] for s in args.size.split(",")]
    want = None
    if args.only:
        want = set()
        for tok in args.only.split(","):
            tok = tok.strip()
            want |= {c["id"] for c in deck["concepts"] if tok == c["id"] or c["id"].startswith(tok)}

    renders, skipped, failures = [], [], []

    for cc in deck["concepts"]:
        cid = cc["id"]
        if want is not None and cid not in want:
            continue
        builder, needs_photo = BUILDERS[cid]
        assets = PHOTO_ASSETS.get(cid, {})

        if needs_photo and (args.cards_only or "photo" not in assets):
            skipped.append((cid, "waiting on a verified photograph" if not args.cards_only else "cards-only"))
            continue

        for cv in sizes:
            try:
                img = builder(cv, cc, assets)
            except C.SafeZoneError as e:
                failures.append(f"{cid} {cv.key}: {e}")
                continue
            except PROV.UnverifiedSourceError as e:
                failures.append(f"{cid} {cv.key}: {e}")
                break

            out = OUT_DIR / cid / f"{cv.key}.png"
            out.parent.mkdir(parents=True, exist_ok=True)
            img.convert("RGB").save(out, "PNG", optimize=True)
            renders.append({
                "concept": cid, "size": cv.key, "path": str(out.relative_to(WAVE)),
                "w": cv.W, "h": cv.H, "sha256": sha256_bytes(out),
            })
            print(f"  wrote {out.relative_to(WAVE)}  {cv.W}x{cv.H}")

            if args.proof:
                pdir = PROOF_DIR / "safe" / cid
                pdir.mkdir(parents=True, exist_ok=True)
                C.proof_overlay(img.convert("RGB"), cv).save(pdir / f"{cv.key}.png", "PNG")
                if cv.key == "4x5":
                    cdir = PROOF_DIR / "crop" / cid
                    cdir.mkdir(parents=True, exist_ok=True)
                    C.as_square_crop(img.convert("RGB")).save(cdir / "4x5-as-square.png", "PNG")

    # MERGE, never replace. A `--only` build produces a subset, and clobbering
    # wave.json with it silently truncates whatever reads it next: the uploader
    # is driven entirely off this list, so a partial build followed by an upload
    # ships a partial wave and reports success. Key on (concept, size) and let
    # this run's fresher entries win.
    prev = {}
    if WAVE_JSON.exists():
        try:
            for r in json.loads(WAVE_JSON.read_text(encoding="utf-8")).get("renders", []):
                prev[(r["concept"], r["size"])] = r
        except (json.JSONDecodeError, KeyError):
            pass
    for r in renders:
        prev[(r["concept"], r["size"])] = r
    merged = [prev[k] for k in sorted(prev)]

    # Drop entries whose file no longer exists, so a renamed or deleted concept
    # cannot linger and break the uploader with a MISSING line.
    merged = [r for r in merged if (WAVE / r["path"]).exists()]

    # Drop entries for concepts the deck no longer carries.
    #
    # The merge above deliberately keeps a previous run's renders alive so that
    # a `--only` build does not truncate the wave. That is exactly what makes
    # this second filter necessary: when a concept is REMOVED from the deck, its
    # PNGs are still sitting on disk (we keep them on purpose, deletions get
    # reverted), so the file-exists check above happily preserves it. The
    # uploader and the seed config are both driven entirely off this list, so a
    # survivor here silently re-ships an ad the client asked us to delete, and
    # reports success while doing it. The deck is the authority on what the wave
    # contains; wave.json only records what was rendered for it.
    live = {c["id"] for c in deck["concepts"]}
    dropped = sorted({r["concept"] for r in merged if r["concept"] not in live})
    merged = [r for r in merged if r["concept"] in live]

    WAVE_JSON.write_text(json.dumps({
        "wave": deck["wave"], "deckHash": deck_hash, "shaping": shaping,
        "renders": merged,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n{len(renders)} render(s) -> {OUT_DIR}")
    for cid in dropped:
        print(f"  DROPPED from wave.json, no longer in the deck: {cid}")
    for cid, why in skipped:
        print(f"  SKIPPED {cid}: {why}")
    if failures:
        print(f"\n{len(failures)} FAILURE(S):")
        for f in failures:
            print(f"  - {f}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
