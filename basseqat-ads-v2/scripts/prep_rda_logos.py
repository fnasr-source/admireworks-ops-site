#!/usr/bin/env python3
"""
Prep Basseqat brand logo for Google Ads RDA logoImages slot.

Google Ads RDA accepts:
- Logo (landscape): 1200x300, PNG/JPG, max 5MB. Aspect 4:1.
- Logo (square):    1200x1200, PNG/JPG, max 5MB. Aspect 1:1.

The Basseqat brand lockup is roughly 1:1 (800x794) so it fits the square slot natively.
For the 4:1 landscape slot we lay out the lockup centered on a cream background.

Outputs go to logo-uploads/{logo-square-1200.png, logo-landscape-1200x300.png}.
"""
from pathlib import Path
from PIL import Image

SRC = Path("/Users/user/Documents/IDE Projects/Admireworks Internal OS/basseqat-ads-v2/logo-uploads/logo-primary-src.png")
OUT_DIR = Path("/Users/user/Documents/IDE Projects/Admireworks Internal OS/basseqat-ads-v2/logo-uploads")
CREAM = (255, 248, 239, 255)  # bsq-cream

def make_square(src_path: Path, out_path: Path, size: int = 1200, pad_ratio: float = 0.08):
    src = Image.open(src_path).convert("RGBA")
    sw, sh = src.size
    canvas = Image.new("RGBA", (size, size), CREAM)
    avail = int(size * (1 - 2 * pad_ratio))
    ratio = min(avail / sw, avail / sh)
    new_w, new_h = int(sw * ratio), int(sh * ratio)
    resized = src.resize((new_w, new_h), Image.LANCZOS)
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    canvas.alpha_composite(resized, (x, y))
    canvas.convert("RGB").save(out_path, optimize=True)
    print(f"  wrote {out_path.name} ({size}x{size})")

def make_landscape(src_path: Path, out_path: Path, w: int = 1200, h: int = 300, pad_ratio: float = 0.08):
    src = Image.open(src_path).convert("RGBA")
    sw, sh = src.size
    canvas = Image.new("RGBA", (w, h), CREAM)
    avail_h = int(h * (1 - 2 * pad_ratio))
    ratio = avail_h / sh
    new_w, new_h = int(sw * ratio), avail_h
    if new_w > w * (1 - 2 * pad_ratio):
        new_w = int(w * (1 - 2 * pad_ratio))
        ratio = new_w / sw
        new_h = int(sh * ratio)
    resized = src.resize((new_w, new_h), Image.LANCZOS)
    x = (w - new_w) // 2
    y = (h - new_h) // 2
    canvas.alpha_composite(resized, (x, y))
    canvas.convert("RGB").save(out_path, optimize=True)
    print(f"  wrote {out_path.name} ({w}x{h})")

if __name__ == "__main__":
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    make_square(SRC, OUT_DIR / "logo-square-1200.png", 1200)
    make_landscape(SRC, OUT_DIR / "logo-landscape-1200x300.png", 1200, 300)
    print("RDA logo assets ready for upload.")
