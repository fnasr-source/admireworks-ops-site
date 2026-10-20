#!/usr/bin/env python3
"""
Build a YouTube companion banner (5:1 strip) entirely in PIL.

Layout:
- 1800 x 360 cream canvas with terracotta border
- Left third (600px wide): real Basseqat logo PNG, vertically centered
- Right two-thirds: Arabic tagline in dark forest green, vertically centered
- Vertical separator line between logo and text

Uses the real brand logo (no AI distortion possible) and renders Arabic
text via PIL + arabic-reshaper + python-bidi with the Madani Arabic font.

English digits (6 not ٦) per client preference.

Usage:
    python make_yt_banner.py \
        --text "مزرعة شغّالة من 6 سنين" \
        --out assets/youtube-banners/banner-2-expats.png
"""
import argparse
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

CREAM = (255, 248, 239, 255)
FOREST = (23, 87, 52, 255)
TERRACOTTA = (191, 121, 85, 255)

LOGO_PATH = Path("/Users/user/Documents/IDE Projects/Admireworks Internal OS/basseqat-ads-v2/logo-uploads/logo-primary-src.png")
# NotoSansArabic has full glyph coverage including all initial/medial/final forms.
# Madani Arabic Bold is missing some contextual glyphs, which dropped letters
# like the initial alif in "استثمر" and the ر in "مزرعة".
FONT_PATH = Path("/Users/user/Library/Fonts/NotoSansArabic[wdth,wght].ttf")

CANVAS_W = 1800
CANVAS_H = 360
BORDER_PX = 4

def render_arabic(text: str, font_size: int) -> Image.Image:
    """Render Arabic text to a transparent PNG, shaped + bidi'd."""
    reshaped = arabic_reshaper.reshape(text)
    display_text = get_display(reshaped)
    font = ImageFont.truetype(str(FONT_PATH), font_size)
    # Measure
    bbox = font.getbbox(display_text)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    pad = 12
    img = Image.new("RGBA", (text_w + 2 * pad, text_h + 2 * pad), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.text((pad - bbox[0], pad - bbox[1]), display_text, font=font, fill=FOREST)
    return img

def make_banner(text: str, out_path: Path):
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), CREAM)
    draw = ImageDraw.Draw(canvas)
    # Terracotta border
    for i in range(BORDER_PX):
        draw.rectangle(
            (i, i, CANVAS_W - 1 - i, CANVAS_H - 1 - i),
            outline=TERRACOTTA,
        )

    # --- Left third: real Basseqat logo ---
    left_zone_w = int(CANVAS_W * 0.32)  # ~580 px
    left_pad = 60
    logo_max_h = CANVAS_H - 80
    logo_max_w = left_zone_w - 2 * left_pad
    logo = Image.open(LOGO_PATH).convert("RGBA")
    lw, lh = logo.size
    scale = min(logo_max_w / lw, logo_max_h / lh)
    new_w, new_h = int(lw * scale), int(lh * scale)
    logo_r = logo.resize((new_w, new_h), Image.LANCZOS)
    lx = (left_zone_w - new_w) // 2
    ly = (CANVAS_H - new_h) // 2
    canvas.alpha_composite(logo_r, (lx, ly))

    # --- Vertical separator ---
    sep_x = left_zone_w + 10
    sep_top = 70
    sep_bot = CANVAS_H - 70
    draw.line(
        [(sep_x, sep_top), (sep_x, sep_bot)],
        fill=(191, 121, 85, 120),
        width=2,
    )

    # --- Right two-thirds: Arabic text ---
    right_zone_x = sep_x + 30
    right_zone_w = CANVAS_W - right_zone_x - 60
    right_zone_h = CANVAS_H

    # Pick a font size that fits the available width
    font_size = 130
    text_img = render_arabic(text, font_size)
    while text_img.width > right_zone_w and font_size > 40:
        font_size -= 4
        text_img = render_arabic(text, font_size)

    tx = right_zone_x + (right_zone_w - text_img.width) // 2
    ty = (CANVAS_H - text_img.height) // 2
    canvas.alpha_composite(text_img, (tx, ty))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, optimize=True)
    print(f"  wrote {out_path.name} ({CANVAS_W}x{CANVAS_H}) text='{text}'")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()
    if not LOGO_PATH.exists():
        print(f"ERROR: logo not found at {LOGO_PATH}", file=sys.stderr)
        sys.exit(1)
    if not FONT_PATH.exists():
        print(f"ERROR: font not found at {FONT_PATH}", file=sys.stderr)
        sys.exit(1)
    make_banner(args.text, args.out)

if __name__ == "__main__":
    main()
