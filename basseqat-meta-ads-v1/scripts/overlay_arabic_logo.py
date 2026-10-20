#!/usr/bin/env python3
"""
Basseqat Meta static creatives: overlay the on-image Arabic line + brand logo
onto a generated base render, in post (PIL). Arabic text is never baked by the
image model; this script is the only place it gets composited.

Usage:
    python3 overlay_arabic_logo.py --manifest manifest.json \
        --raw-dir assets/after/raw --out-dir assets/after \
        --fonts-dir <dir with MadaniArabic-*.ttf> --brand-dir <apps/web/public/brand>

The Basseqat repo only ships Madani Arabic as .woff2 (apps/web/public/fonts/),
which PIL's ImageFont cannot load directly. Convert once with fontTools:
    python3 -c "
    from fontTools.ttLib import TTFont
    f = TTFont('MadaniArabic-Bold.woff2'); f.flavor = None
    f.save('MadaniArabic-Bold.ttf')"

Requires a Pillow build with libraqm (PIL.features.check('raqm') == True) so
Arabic shaping/bidi happens automatically inside draw.text(). Pass RAW logical
Arabic text straight through; do NOT pre-process with arabic_reshaper or
python-bidi, that double-shapes the text and produces scrambled glyphs.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

CREAM = (255, 248, 239)
FOREST = (23, 87, 52)

# This Pillow build has libraqm (PIL.features.check("raqm") == True), which
# shapes and bidi-reorders Arabic automatically inside draw.text()/textlength().
# Do NOT pre-reshape with arabic_reshaper or reverse with python-bidi here:
# that double-processes the text and produces garbled, scrambled glyphs.
# Pass raw logical-order Arabic straight through.


def luminance(img: Image.Image, box) -> float:
    crop = np.asarray(img.crop(box).convert("RGB")).astype(float)
    return float((0.299 * crop[:, :, 0] + 0.587 * crop[:, :, 1] + 0.114 * crop[:, :, 2]).mean())


def feathered_scrim(w, h, color, top, amax):
    feather = int(h * 0.35)
    s0 = max(0, top - feather)
    col = np.zeros(h, np.float64)
    for y in range(h):
        col[y] = 0.0 if y < s0 else ((y - s0) / max(1, feather) if y < top else 1.0)
    alpha = np.clip(col * amax, 0, 255).astype(np.uint8)[:, None].repeat(w, axis=1)
    scrim = Image.new("RGBA", (w, h), (*color, 0))
    scrim.putalpha(Image.fromarray(alpha, "L"))
    return scrim


def fit_font(fonts_dir: Path, text: str, max_w: int, draw: ImageDraw.ImageDraw, big=90, small=44):
    path = str(fonts_dir / "MadaniArabic-Bold.ttf")
    for size in range(big, small - 1, -4):
        f = ImageFont.truetype(path, size)
        w = draw.textlength(text, font=f)
        if w <= max_w:
            return f, text
    f = ImageFont.truetype(path, small)
    return f, text


def load_logo(brand_dir: Path, target_w: int) -> Image.Image:
    # Always the standard 2-color (forest + terracotta) compact lockup on a
    # cream backing chip (matches basseqat-ads-v2/scripts/logo_composite.py).
    # The chip is what guarantees contrast against the photo, not a
    # background-dependent logo color swap, so this never goes cream-on-cream.
    lg = Image.open(brand_dir / "logo-arabic.png").convert("RGBA")
    w, h = lg.size
    new_h = int(h * target_w / w)
    return lg.resize((target_w, new_h), Image.LANCZOS)


def compose(raw_path: Path, on_image_line: str, fonts_dir: Path, brand_dir: Path, out_path: Path):
    base = Image.open(raw_path).convert("RGBA")
    W, H = base.size
    canvas = base.copy()

    # Sample the lower-third band to decide text/scrim polarity.
    band_top = int(H * 0.68)
    lum = luminance(canvas, (0, band_top, W, H))
    dark_bg = lum < 140

    scrim_color = (20, 15, 10) if dark_bg else CREAM
    scrim_amax = 190 if dark_bg else 150
    canvas.alpha_composite(feathered_scrim(W, H, scrim_color, band_top, scrim_amax))

    draw = ImageDraw.Draw(canvas)
    margin = int(W * 0.09)
    max_w = W - 2 * margin
    font, shaped = fit_font(fonts_dir, on_image_line, max_w, draw)
    text_color = (255, 255, 255) if dark_bg else FOREST
    shadow_color = (0, 0, 0, 140) if dark_bg else (255, 248, 239, 160)

    tw = draw.textlength(shaped, font=font)
    tx = (W - tw) / 2
    ty = H * 0.855 - font.size / 2

    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.text((tx, ty), shaped, font=font, fill=shadow_color)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(3))
    canvas.alpha_composite(shadow_layer)
    draw = ImageDraw.Draw(canvas)
    draw.text((tx, ty), shaped, font=font, fill=text_color)

    # Corner logo (compact lockup) with a soft cream backing chip for
    # legibility, placed top-left, well clear of the bottom text band.
    logo_w = int(W * 0.20)
    logo = load_logo(brand_dir, logo_w)
    pad = int(logo_w * 0.14)
    chip_w, chip_h = logo.width + 2 * pad, logo.height + 2 * pad
    chip_color = (*CREAM, 225)
    from PIL import ImageDraw as _ImageDraw
    mask = Image.new("L", (chip_w, chip_h), 0)
    _ImageDraw.Draw(mask).rounded_rectangle((0, 0, chip_w, chip_h), radius=pad, fill=255)
    solid = Image.new("RGBA", (chip_w, chip_h), chip_color)
    solid.putalpha(mask)
    mx, my = int(W * 0.05), int(W * 0.05)
    canvas.alpha_composite(solid, (mx, my))
    canvas.alpha_composite(logo, (mx + pad, my + pad))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out_path, "PNG", optimize=True)
    print(f"  {raw_path.name} -> {out_path.name} (dark_bg={dark_bg}, font_size={font.size})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True, type=Path)
    ap.add_argument("--raw-dir", required=True, type=Path)
    ap.add_argument("--out-dir", required=True, type=Path)
    ap.add_argument("--fonts-dir", required=True, type=Path)
    ap.add_argument("--brand-dir", required=True, type=Path)
    args = ap.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    for item in manifest:
        raw_path = args.raw_dir / item["raw"]
        out_path = args.out_dir / item["out"]
        compose(raw_path, item["on_image_line"], args.fonts_dir, args.brand_dir, out_path)


if __name__ == "__main__":
    main()
