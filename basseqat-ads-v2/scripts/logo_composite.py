#!/usr/bin/env python3
"""
Basseqat Ads v2, composite the Basseqat brand logo onto a creative image.

Usage:
    python logo_composite.py \
        --in <source.png> \
        --out <out.png> \
        --slot landscape|square \
        --logo <path-to-logo.png>

Positions the logo in the bottom-right safe zone at a size that respects
the brand book's min sizes (~75px digital with tagline, ~100px without).
"""
import argparse
import sys
from pathlib import Path
from PIL import Image


def composite(src: Path, logo: Path, out: Path, slot: str):
    base = Image.open(src).convert("RGBA")
    bw, bh = base.size

    # Logo target height: 12% of image height for square, 16% for landscape.
    # That sits comfortably above the brand book's 75px digital minimum
    # for both 1024px square and 1376x714 landscape.
    pct = 0.16 if slot == "landscape" else 0.12
    target_h = int(bh * pct)

    lg = Image.open(logo).convert("RGBA")
    lw, lh = lg.size
    new_w = int(lw * target_h / lh)
    lg_resized = lg.resize((new_w, target_h), Image.LANCZOS)

    # Bottom-right safe zone: margin of ~4% of width on the right, ~4% of height on the bottom.
    margin_x = int(bw * 0.04)
    margin_y = int(bh * 0.04)
    x = bw - lg_resized.width - margin_x
    y = bh - lg_resized.height - margin_y

    # Soft white-cream backing card for legibility on photo backgrounds.
    # 8px padding around logo, rounded corners.
    pad = int(target_h * 0.10)
    card_w = lg_resized.width + 2 * pad
    card_h = lg_resized.height + 2 * pad
    card = Image.new("RGBA", (card_w, card_h), (255, 248, 239, 235))  # bsq-cream @ 92% alpha

    # Apply rounded mask to card
    from PIL import ImageDraw
    mask = Image.new("L", (card_w, card_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, card_w, card_h), radius=pad, fill=255)
    card.putalpha(mask)

    canvas = base.copy()
    card_x = x - pad
    card_y = y - pad
    canvas.alpha_composite(card, (card_x, card_y))
    canvas.alpha_composite(lg_resized, (x, y))

    out.parent.mkdir(parents=True, exist_ok=True)
    # Save as PNG always to preserve quality + alpha if input was JPEG.
    if out.suffix.lower() in {".jpg", ".jpeg"}:
        canvas.convert("RGB").save(out, quality=92, optimize=True)
    else:
        canvas.save(out, optimize=True)
    print(f"  composited logo onto {src.name} -> {out.name} ({bw}x{bh}, logo h={target_h}px)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True, type=Path)
    ap.add_argument("--out", dest="out", required=True, type=Path)
    ap.add_argument("--slot", choices=["landscape", "square"], required=True)
    ap.add_argument("--logo", required=True, type=Path)
    args = ap.parse_args()

    if not args.src.exists():
        print(f"ERROR: source not found {args.src}", file=sys.stderr)
        sys.exit(1)
    if not args.logo.exists():
        print(f"ERROR: logo not found {args.logo}", file=sys.stderr)
        sys.exit(1)

    composite(args.src, args.logo, args.out, args.slot)


if __name__ == "__main__":
    main()
