#!/usr/bin/env python3
"""
PIL-only social-icon + URL removal: paint over the corners of the ORIGINAL
image with color-matched fills sampled from neighbouring pixels, then
optionally composite the Basseqat logo in a specified corner.

This avoids Nano Banana regenerating the whole image, so we keep every
other pixel pixel-perfect. Right tool for designs that have body text
or fine typography that we can't risk corrupting.

Usage:
    python pil_clean_corners.py \
        --in source-creatives/362635430414.png \
        --out assets/after/362635430414.png \
        --logo logo-uploads/logo-primary-src.png \
        --logo-position top-left \
        --social-corner top-right --social-w 270 --social-h 80 \
        --url-corner top-left  --url-w 240 --url-h 60
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

def sample_color(img: Image.Image, x: int, y: int, w: int, h: int) -> tuple:
    """Sample the average color of a 20px strip JUST OUTSIDE the cleaning region,
    so the fill blends naturally into the surrounding background.
    Sample below the region (downward into the image)."""
    sample_y_start = y + h + 5
    sample_y_end = min(img.height, sample_y_start + 30)
    sample_x_start = max(0, x)
    sample_x_end = min(img.width, x + w)
    if sample_y_end <= sample_y_start or sample_x_end <= sample_x_start:
        return (255, 248, 239)  # fallback to cream
    region = img.crop((sample_x_start, sample_y_start, sample_x_end, sample_y_end)).convert("RGB")
    # Average pixels
    pixels = list(region.getdata())
    n = len(pixels)
    r = sum(p[0] for p in pixels) // n
    g = sum(p[1] for p in pixels) // n
    b = sum(p[2] for p in pixels) // n
    return (r, g, b)


def fill_top_with_natural_sky(img: Image.Image, dirty_height: int) -> Image.Image:
    """Replace the top dirty_height rows of img with a uniform-per-row sky
    gradient extrapolated upward, then blend the bottom 40 rows of the
    painted area toward the actual per-column boundary so there is no
    visible color step at the seam. Uniform-per-row avoids vertical streaks
    from JPEG / sensor noise in any single source row."""
    import numpy as np
    iw, ih = img.size
    arr = np.asarray(img.convert("RGB")).astype(np.float32)  # (H, W, 3)

    # Sample boundary as AVERAGE over a 20-row band starting at dirty_height
    band_h = 20
    boundary_band_end = min(ih, dirty_height + band_h)
    boundary_avg = arr[dirty_height:boundary_band_end].mean(axis=(0, 1))  # (3,)

    # Sample "below" as AVERAGE over a 20-row band, 60 rows further down
    below_band_start = min(ih - 1, dirty_height + 60)
    below_band_end = min(ih, below_band_start + band_h)
    below_avg = arr[below_band_start:below_band_end].mean(axis=(0, 1))    # (3,)

    # Per-row delta going UP from boundary
    span = max(1, ((below_band_start + below_band_end) // 2) - ((dirty_height + boundary_band_end) // 2))
    delta_up = -(below_avg - boundary_avg) / span                          # (3,)

    # Build uniform-per-row gradient
    rows_above = np.arange(dirty_height - 1, -1, -1, dtype=np.float32)     # (H,)
    gradient_rows = boundary_avg[None, :] + delta_up[None, :] * rows_above[:, None]  # (H, 3)
    gradient_rows = np.clip(gradient_rows, 0, 255)
    # Broadcast to full width: every column same color in a given row
    gradient_2d = np.broadcast_to(gradient_rows[:, None, :], (dirty_height, iw, 3)).copy()  # (H, W, 3)

    # Replace top rows in new_arr
    new_arr = arr.copy()
    new_arr[:dirty_height] = gradient_2d

    # Per-column target = the actual row at the boundary (y = dirty_height), preserved as-is
    target_row = arr[dirty_height]   # (W, 3), unchanged kept original

    # Blend zone: smoothly transition from painted-uniform to target-per-column
    # over the bottom 40 rows of the painted area. At y = dirty_height - 1
    # the result equals target_row exactly, hiding any color step.
    blend_zone = 40
    blend_start = max(0, dirty_height - blend_zone)
    for offset in range(blend_zone):
        y = dirty_height - 1 - offset                # iterate from bottom up
        # t = 0 at the bottom row (full target), t = 1 at the top of the blend zone (full painted)
        t = offset / max(1, blend_zone - 1)
        new_arr[y] = new_arr[y] * t + target_row * (1 - t)

    new_arr = np.clip(new_arr, 0, 255).astype(np.uint8)

    # Hard-enforce: row dirty_height - 1 must exactly equal row dirty_height per column
    new_arr[dirty_height - 1] = new_arr[dirty_height]

    return Image.fromarray(new_arr, mode="RGB").convert("RGBA")

def paint_over_corner(img: Image.Image, corner: str, w: int, h: int, margin: int = 20) -> Image.Image:
    """Paint a color-matched rectangle over a corner region of the image."""
    iw, ih = img.size
    if corner == "top-left":
        x, y = 0, 0
    elif corner == "top-right":
        x, y = iw - w, 0
    elif corner == "bottom-left":
        x, y = 0, ih - h
    elif corner == "bottom-right":
        x, y = iw - w, ih - h
    else:
        raise ValueError(f"unknown corner {corner}")

    fill_color = sample_color(img, x, y, w, h)

    # Make a soft-edged mask so the patch fades into the background rather than
    # showing as a hard-edged rectangle.
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    # Draw the patch slightly larger than requested so the soft edge covers everything
    pad = 12
    draw.rectangle((x - pad, y - pad, x + w + pad, y + h + pad), fill=fill_color + (255,))
    # Blur the edges
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=6))
    img = img.convert("RGBA")
    img = Image.alpha_composite(img, overlay)
    return img

def composite_logo(img: Image.Image, logo_path: Path, position: str, pct_height: float = 0.10) -> Image.Image:
    """Composite the Basseqat logo into the specified corner of img."""
    base = img.convert("RGBA")
    bw, bh = base.size
    target_h = int(bh * pct_height)
    lg = Image.open(logo_path).convert("RGBA")
    lw, lh = lg.size
    new_w = int(lw * target_h / lh)
    lg_r = lg.resize((new_w, target_h), Image.LANCZOS)
    margin_x = int(bw * 0.04)
    margin_y = int(bh * 0.04)
    if position == "top-left":
        x, y = margin_x, margin_y
    elif position == "top-right":
        x, y = bw - lg_r.width - margin_x, margin_y
    elif position == "bottom-right":
        x, y = bw - lg_r.width - margin_x, bh - lg_r.height - margin_y
    elif position == "bottom-left":
        x, y = margin_x, bh - lg_r.height - margin_y
    else:
        raise ValueError(f"unknown position {position}")

    # Cream backing card for legibility
    pad = int(target_h * 0.12)
    card_w = lg_r.width + 2 * pad
    card_h = lg_r.height + 2 * pad
    card = Image.new("RGBA", (card_w, card_h), (255, 248, 239, 235))
    mask = Image.new("L", (card_w, card_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, card_w, card_h), radius=pad, fill=255)
    card.putalpha(mask)
    base.alpha_composite(card, (x - pad, y - pad))
    base.alpha_composite(lg_r, (x, y))
    return base

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True, type=Path)
    ap.add_argument("--out", dest="out", required=True, type=Path)
    ap.add_argument("--logo", type=Path, default=None)
    ap.add_argument("--logo-position", choices=["top-left", "top-right", "bottom-right", "bottom-left"], default=None)
    ap.add_argument("--logo-height-pct", type=float, default=0.10)
    ap.add_argument("--social-corner", choices=["top-left", "top-right", "bottom-left", "bottom-right"], default=None)
    ap.add_argument("--social-w", type=int, default=270)
    ap.add_argument("--social-h", type=int, default=80)
    ap.add_argument("--url-corner", choices=["top-left", "top-right", "bottom-left", "bottom-right"], default=None)
    ap.add_argument("--url-w", type=int, default=240)
    ap.add_argument("--url-h", type=int, default=60)
    ap.add_argument("--top-strip", type=int, default=0,
                    help="If > 0, paint the entire top strip of this many pixels with sampled background color. Overrides social/url corner painting.")
    args = ap.parse_args()

    img = Image.open(args.src).convert("RGBA")
    if args.top_strip > 0:
        img = fill_top_with_natural_sky(img, args.top_strip)
    else:
        if args.social_corner:
            img = paint_over_corner(img, args.social_corner, args.social_w, args.social_h)
        if args.url_corner:
            img = paint_over_corner(img, args.url_corner, args.url_w, args.url_h)
    if args.logo and args.logo_position:
        img = composite_logo(img, args.logo, args.logo_position, args.logo_height_pct)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.suffix.lower() in {".jpg", ".jpeg"}:
        img.convert("RGB").save(args.out, quality=92, optimize=True)
    else:
        img.save(args.out, optimize=True)
    print(f"  wrote {args.out.name} ({img.width}x{img.height})")

if __name__ == "__main__":
    main()
