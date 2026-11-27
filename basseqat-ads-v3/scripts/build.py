#!/usr/bin/env python3
"""
Basseqat ads v3 (BSQ-187, board card B11): the replacement for «GCC | C8 departure»,
plus optional replacements for the two smaller flagged ads.

No image model is called anywhere in this file. Every pixel of photography is a real
Basseqat photo, gated by sha256 and by an allowed crop window in
assets/source/PROVENANCE.jsonl; the only operations on it are crop, Lanczos resize and
a mild global tone grade. Text comes only from copy/copy-deck.json, set in Madani
Arabic through raqm (lib_fonts from basseqat-meta-ads-v3, kern off), and every text,
panel and logo box is checked against the placement safe band (lib_canvas.assert_safe).

    python3 basseqat-ads-v3/scripts/build.py            # all concepts
    python3 basseqat-ads-v3/scripts/build.py --only a,b
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

WAVE = Path(__file__).resolve().parent.parent
REPO = WAVE.parent
sys.path.insert(0, str(REPO / "basseqat-meta-ads-v3" / "scripts"))
import lib_fonts as FNT  # noqa: E402
import lib_canvas as LC  # noqa: E402
from lib_canvas import CREAM, FOREST, TERRA, SQ, FD, ST, Ink, assert_safe  # noqa: E402

DECK = json.loads((WAVE / "copy" / "copy-deck.json").read_text(encoding="utf-8"))
LEDGER = [json.loads(l) for l in (WAVE / "assets" / "source" / "PROVENANCE.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
OUT = WAVE / "assets" / "creatives"
EM_DASH = chr(0x2014)

# Crop windows in SOURCE pixels (x0, y0, x1, y1), per concept and canvas. Each must sit
# inside one of the photo's allowedWindows in the ledger, or the build stops.
# Concept a is full bleed; b and c are split: brand type on cream above, the photo below.
WINDOWS = {
    "a": {"1x1": (610, 0, 3390, 2780), "4x5": (1478, 0, 3702, 2780), "9x16": (1808, 0, 3372, 2780)},
    "b": {"1x1": (200, 1400, 1600, 2042), "4x5": (200, 1380, 1600, 2137), "9x16": (0, 1250, 1600, 2819)},
    "c": {"1x1": (0, 342, 1448, 1086), "4x5": (0, 254, 1448, 1086), "9x16": (186, 0, 1262, 1086)},
}
MODE = {"a": "bleed", "b": "split", "c": "split"}
PMAX = {  # concept d: photo only, Google PMax sizes
    "square-1200x1200": ((610, 0, 3390, 2780), (1200, 1200)),
    "landscape-1200x628": ((0, 560, 4000, 2653), (1200, 628)),
    "portrait-960x1200": ((1478, 0, 3702, 2780), (960, 1200)),
}


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_safe(name: str, window: tuple) -> Image.Image:
    rows = [r for r in LEDGER if r["file"] == name]
    if len(rows) != 1:
        raise SystemExit(f"{name}: expected exactly one ledger row, found {len(rows)}")
    r = rows[0]
    if r["visual"]["verdict"] != "SAFE":
        raise SystemExit(f"{name}: visual verdict is {r['visual']['verdict']}, not SAFE")
    p = Path(r["path"])
    got = sha256(p)
    if got != r["sha256"]:
        raise SystemExit(f"{name}: sha256 {got[:12]} does not match the ledger {r['sha256'][:12]}")
    x0, y0, x1, y1 = window
    if not any(a <= x0 and b <= y0 and x1 <= c and y1 <= d for a, b, c, d in r["allowedWindows"]):
        raise SystemExit(f"{name}: crop {window} is outside every allowed window {r['allowedWindows']}")
    im = Image.open(p).convert("RGB")
    if (im.width, im.height) != (r["w"], r["h"]):
        raise SystemExit(f"{name}: size {im.size} does not match the ledger")
    return im.crop(window)


def check_text(s: str) -> str:
    if EM_DASH in s:
        raise SystemExit(f"em dash in copy: {s}")
    return s


def photo_into(canvas: Image.Image, crop: Image.Image, box: tuple) -> None:
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    tile = LC.grade(LC.cover(crop, w, h), contrast=1.03, color=1.03, bright=1.0, sharp=1.02)
    canvas.paste(tile, (x0, y0))


def band(canvas, box, rgba):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle(box, fill=rgba)
    canvas.alpha_composite(layer)


def shadowed(canvas, ink, right_x, y, s, font, fill, label, radius=7, alpha=120):
    """Right-aligned text with a soft dark glow behind it, for type over a photo."""
    from PIL import ImageFilter
    w = ink.textlength(s, font=font)
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((right_x - w, y), s, font=font, fill=(0, 0, 0, alpha), features=FNT.ARABIC_FEATURES)
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius)))
    ink.text_rtl(right_x, y, s, font, fill, label=label)


def text_mid(ink, x, y0, y1, s, font, fill, label):
    bb = ink.d.textbbox((0, 0), s, font=font, features=FNT.ARABIC_FEATURES)
    ink.text((x, (y0 + y1) / 2 - (bb[1] + bb[3]) / 2), s, font, fill, label=label)


def cta_band(ink, cv, y0, y1, text):
    # Flat band: a plain rectangle, no rounding, no shadow (Meta prints the real button).
    ink.rectangle((cv.inset_l, y0, cv.W - cv.inset_r, y1), fill=TERRA)
    ink.record_panel((cv.inset_l, y0, cv.W - cv.inset_r, y1), label="cta band")
    cf = LC.fit_font(ink, text, FNT.SEMI, {"1x1": 44, "4x5": 46, "9x16": 50}[cv.key], 30, cv.safe_w - 40)
    text_mid(ink, cv.center_x - ink.textlength(text, font=cf) / 2, y0, y1, text, cf, CREAM, "cta")


def caption(canvas, ink, cv, text):
    cap_f = FNT.REG({"1x1": 26, "4x5": 28, "9x16": 30}[cv.key])
    y1 = cv.safe_bottom
    y0 = y1 - int(cap_f.size * 1.75)
    cw = ink.textlength(text, font=cap_f)
    box = (int(cv.right - cw - 24), y0, cv.right, y1)
    band(canvas, box, (20, 18, 14, 150))
    ink.record_panel(box, label="caption band")
    text_mid(ink, cv.right - 12 - cw, y0, y1, text, cap_f, CREAM, "caption")
    return y0


def render(key: str, cv) -> Image.Image:
    c = DECK["concepts"][key]
    oi = {k: (check_text(v) if isinstance(v, str) else [check_text(x) for x in v]) for k, v in c["onImage"].items()}
    canvas = Image.new("RGBA", (cv.W, cv.H), (*CREAM, 255))
    crop = load_safe(c["photo"], WINDOWS[key][cv.key])
    right, maxw = cv.right, cv.safe_w

    if MODE[key] == "bleed":
        photo_into(canvas, crop, (0, 0, cv.W, cv.H))
        top_frac = {"1x1": 0.46, "4x5": 0.42, "9x16": 0.40}[cv.key]
        LC.scrim(canvas, start_frac=top_frac * 0.40, feather_frac=top_frac * 0.55, amax=105, side="top")
        LC.scrim(canvas, start_frac=0.80, feather_frac=0.14, amax=80, side="bottom")
        ink = Ink(canvas, cv)
        chip = LC.logo_chip(canvas, ink, cv, corner="tl", logo_w=150 if cv.key == "1x1" else 165)
        y = chip[3] + (18 if cv.key == "1x1" else 30)
        hf = LC.fit_font(ink, oi["headline"], FNT.BOLD, {"1x1": 104, "4x5": 112, "9x16": 118}[cv.key], 60, maxw)
        shadowed(canvas, ink, right, y, oi["headline"], hf, (255, 255, 255), "headline")
        y += int(hf.size * 1.42)
        sf = LC.fit_font(ink, oi["sub"], FNT.SEMI, {"1x1": 50, "4x5": 54, "9x16": 58}[cv.key], 34, maxw)
        shadowed(canvas, ink, right, y, oi["sub"], sf, CREAM, "sub", radius=6, alpha=150)
        head_bottom = y + int(sf.size * 1.4)
        cap_y0 = caption(canvas, ink, cv, oi["caption"])
        cta_h = {"1x1": 84, "4x5": 92, "9x16": 98}[cv.key]
        cta_y1 = cap_y0 - 12
        if cta_y1 - cta_h < head_bottom + 10:
            raise SystemExit(f"{key} {cv.key}: CTA runs into the headline block")
        cta_band(ink, cv, cta_y1 - cta_h, cta_y1, oi["cta"])
        assert_safe(cv, ink)
        return canvas.convert("RGB")

    # split: logo, kicker and headline beside it, chips, CTA band on cream; photo below.
    ink = Ink(canvas, cv)
    chip = LC.logo_chip(canvas, ink, cv, corner="tl", logo_w=150 if cv.key == "1x1" else 165, cream_chip=False)
    beside = maxw - (chip[2] - chip[0]) - 28
    y = chip[1] + 6
    kf = LC.fit_font(ink, oi["kicker"], FNT.SEMI, {"1x1": 46, "4x5": 50, "9x16": 50}[cv.key], 30, beside)
    ink.text_rtl(right, y, oi["kicker"], kf, TERRA, label="kicker")
    y += int(kf.size * 1.5)
    hf = LC.fit_font(ink, oi["headline"], FNT.BOLD, {"1x1": 92, "4x5": 100, "9x16": 96}[cv.key], 52, beside)
    ink.text_rtl(right, y, oi["headline"], hf, FOREST, label="headline")
    y = max(y + int(hf.size * 1.45), chip[3] + 16)
    ink.line((cv.inset_l, y, right, y), fill=LC.HAIRLINE, width=3)
    y += {"1x1": 16, "4x5": 22, "9x16": 26}[cv.key]
    rf = FNT.SEMI({"1x1": 38, "4x5": 40, "9x16": 42}[cv.key])
    row_h = int(rf.size * 1.62)
    for i, s in enumerate(oi["chips"]):
        cy = y + row_h // 2
        dot_r = 8
        ink.ellipse((right - 2 * dot_r, cy - dot_r, right, cy + dot_r), fill=TERRA)
        w = ink.textlength(s, font=rf)
        text_mid(ink, right - 2 * dot_r - 18 - w, y, y + row_h, s, rf, LC.INK, f"chip{i}")
        y += row_h
    y += {"1x1": 12, "4x5": 18, "9x16": 22}[cv.key]
    cta_h = {"1x1": 80, "4x5": 88, "9x16": 96}[cv.key]
    cta_band(ink, cv, y, y + cta_h, oi["cta"])
    photo_top = y + cta_h + {"1x1": 20, "4x5": 24, "9x16": 28}[cv.key]
    ph = cv.H - photo_top
    if ph < 380:
        raise SystemExit(f"{key} {cv.key}: photo band only {ph}px tall")
    win = WINDOWS[key][cv.key]
    want = (win[2] - win[0]) / (win[3] - win[1])
    have = cv.W / ph
    if abs(want - have) / have > 0.12:
        print(f"  note {key} {cv.key}: window aspect {want:.2f} vs band {have:.2f} (cover-crop trims the difference)")
    photo_into(canvas, crop, (0, photo_top, cv.W, cv.H))
    ink = _reink(ink, canvas)
    caption(canvas, ink, cv, oi["caption"])
    assert_safe(cv, ink)
    return canvas.convert("RGB")


def _reink(old: Ink, canvas: Image.Image) -> Ink:
    """band() composites a new layer; keep the recorded marks and redraw on the canvas."""
    new = Ink(canvas, old.cv)
    new.marks = old.marks
    return new


def contact(paths, out, h=720):
    ims = [Image.open(p).convert("RGB") for p in paths]
    row = [im.resize((int(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
    sheet = Image.new("RGB", (sum(r.width for r in row) + 16 * (len(row) - 1), h), (255, 255, 255))
    x = 0
    for r in row:
        sheet.paste(r, (x, 0))
        x += r.width + 16
    sheet.save(out, quality=88)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="a,b,c,d")
    args = ap.parse_args()
    FNT.assert_shaping()
    OUT.mkdir(parents=True, exist_ok=True)
    built = []
    for key in args.only.split(","):
        if key == "d":
            for name, (win, size) in PMAX.items():
                im = LC.grade(LC.cover(load_safe(DECK["concepts"]["d"]["photo"], win), *size), contrast=1.03, color=1.03, bright=1.0, sharp=1.02)
                p = OUT / f"d-pmax-{name}.jpg"
                im.save(p, quality=92, subsampling=0)
                built.append(p)
            continue
        paths = []
        for cv in (SQ, FD, ST):
            im = render(key, cv)
            p = OUT / f"{key}-{cv.key}.png"
            im.save(p, optimize=True)
            paths.append(p)
            if cv.key == "4x5":
                sq = LC.as_square_crop(im)
                sp = OUT / f"{key}-4x5-as-square.jpg"
                sq.save(sp, quality=88)
            built.append(p)
        contact(paths, OUT.parent / f"_contact-{key}.jpg")
    for p in built:
        print(f"built {p.relative_to(REPO)}  {Image.open(p).size}  sha {sha256(p)[:12]}")


if __name__ == "__main__":
    main()
