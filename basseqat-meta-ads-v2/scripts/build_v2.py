#!/usr/bin/env python3
"""
Build the v2 Basseqat Meta static raws + finished cards.
Founder = his REAL pixels only (rembg cutout of his real photos, composited onto
AI-generated scenes; his face never passes through an image model). AI scenes
live in assets/gen/. Custom typographic cards are drawn fully in PIL (raqm
shaping: pass RAW logical Arabic, never pre-reshape). Standard-overlay concepts
write raws to assets/after/raw for overlay_arabic_logo.py; custom cards write
finished PNGs straight to assets/after.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
import numpy as np

BASE = Path("/Users/user/Documents/IDE Projects/Admireworks Internal OS/basseqat-meta-ads-v2")
GEN = BASE / "assets/gen"
RAW = BASE / "assets/after/raw"
OUT = BASE / "assets/after"
IMG = Path("/Users/user/Documents/IDE Projects/Basseqat/apps/web/public/images")
BRAND = Path("/Users/user/Documents/IDE Projects/Basseqat/apps/web/public/brand")
FONTS = Path("/private/tmp/claude-501/-Users-user-Documents-IDE-Projects-Basseqat/0e74e7e7-62b7-4fad-9df1-908d1ff34af6/scratchpad/fonts-ttf")
for d in (RAW, OUT):
    d.mkdir(parents=True, exist_ok=True)

S = 1080
CREAM = (255, 248, 239)
FOREST = (23, 87, 52)
TERRA = (191, 121, 85)
INK = (34, 44, 38)

BOLD = str(FONTS / "MadaniArabic-Bold.ttf")
SEMI = str(FONTS / "MadaniArabic-SemiBold.ttf")
REG = str(FONTS / "MadaniArabic-Regular.ttf")


def F(path, size):
    return ImageFont.truetype(path, size)


def load(p):
    return Image.open(p).convert("RGB")


def cover(img, w, h, zoom=1.0, ax=0.5, ay=0.5):
    iw, ih = img.size
    scale = max(w / iw, h / ih) * zoom
    nw, nh = int(iw * scale + 0.5), int(ih * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = int((nw - w) * ax); top = int((nh - h) * ay)
    left = max(0, min(left, nw - w)); top = max(0, min(top, nh - h))
    return img.crop((left, top, left + w, top + h))


def grade(img, contrast=1.05, color=1.06, bright=1.01, sharp=1.06):
    img = ImageEnhance.Contrast(img).enhance(contrast)
    img = ImageEnhance.Color(img).enhance(color)
    img = ImageEnhance.Brightness(img).enhance(bright)
    return ImageEnhance.Sharpness(img).enhance(sharp)


def warm(img, r=1.06, b=0.94, bright=0.99):
    """Warm-shift a person layer to match a golden scene."""
    rgb = img.convert("RGB") if img.mode != "RGBA" else None
    if img.mode == "RGBA":
        rch, gch, bch, a = img.split()
        rch = rch.point(lambda v: min(255, int(v * r)))
        bch = bch.point(lambda v: int(v * b))
        out = Image.merge("RGBA", (rch, gch, bch, a))
        return ImageEnhance.Brightness(out).enhance(bright)
    rch, gch, bch = rgb.split()
    rch = rch.point(lambda v: min(255, int(v * r)))
    bch = bch.point(lambda v: int(v * b))
    return ImageEnhance.Brightness(Image.merge("RGB", (rch, gch, bch))).enhance(bright)


def save(img, where, name):
    img.convert("RGB").save(where / name, "PNG", optimize=True)
    print("  wrote", (where / name).relative_to(BASE), img.size)


# ---------- founder cutout ----------

def cutout(path):
    from rembg import remove
    src = Image.open(path).convert("RGBA")
    out = remove(src)
    a = np.asarray(out.split()[-1])
    ys, xs = np.where(a > 12)
    if len(xs):
        out = out.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    arr = np.asarray(out).astype(np.int16).copy()
    # Defringe the crown: rembg keeps a blue sky tuft above the bald head.
    # In the top band only (no blue shirt up there), kill strongly-blue pixels.
    head_band = int(arr.shape[0] * 0.16)
    tb = arr[:head_band]
    blue_sky = (tb[:, :, 2] > tb[:, :, 0] + 14) & (tb[:, :, 2] > tb[:, :, 1] + 8)
    tb[:, :, 3][blue_sky] = 0
    arr[:head_band] = tb
    out = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")
    r, g, b, al = out.split()
    al = al.filter(ImageFilter.MinFilter(3))
    al = al.filter(ImageFilter.GaussianBlur(1.3))
    return Image.merge("RGBA", (r, g, b, al))


def person_scaled(person, width_frac):
    tw = int(S * width_frac)
    return person.resize((tw, int(person.height * tw / person.width)), Image.LANCZOS)


def composite_waist(person_rgba, bg, width_frac=0.5, cx=0.5, top_frac=0.06):
    """v1 pattern: head near top, torso runs off the bottom edge."""
    canvas = bg.convert("RGBA")
    p = person_scaled(person_rgba, width_frac)
    canvas.alpha_composite(p, (int(S * cx - p.width / 2), int(S * top_frac)))
    return canvas.convert("RGB")


def composite_behind(person_rgba, bg, occl_y=0.56, width_frac=0.36, cx=0.62, top_frac=0.10):
    """Person appears chest-up BEHIND a foreground band: paste person, then
    re-paste the original bottom strip with a feathered top edge."""
    canvas = bg.convert("RGBA")
    p = person_scaled(person_rgba, width_frac)
    canvas.alpha_composite(p, (int(S * cx - p.width / 2), int(S * top_frac)))
    strip_top = int(S * occl_y)
    strip = bg.crop((0, strip_top, S, S)).convert("RGBA")
    feather = 26
    mask = Image.new("L", (S, S - strip_top), 255)
    md = np.ones((S - strip_top, S), np.uint8) * 255
    for y in range(feather):
        md[y, :] = int(255 * y / feather)
    mask = Image.fromarray(md, "L")
    canvas.paste(strip, (0, strip_top), mask)
    return canvas.convert("RGB")


# ---------- text helpers (raqm shapes raw logical Arabic) ----------

def wrap_rtl(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def rtl_text(draw, xy_right, text, font, fill, anchor_top=True):
    """Draw a single line right-aligned at x=xy_right[0]."""
    w = draw.textlength(text, font=font)
    draw.text((xy_right[0] - w, xy_right[1]), text, font=font, fill=fill)
    return w


def logo_chip(canvas, top_left=None, logo_w_frac=0.20):
    W = canvas.width
    lg = Image.open(BRAND / "logo-arabic.png").convert("RGBA")
    logo_w = int(W * logo_w_frac)
    lg = lg.resize((logo_w, int(lg.height * logo_w / lg.width)), Image.LANCZOS)
    pad = int(logo_w * 0.14)
    chip_w, chip_h = lg.width + 2 * pad, lg.height + 2 * pad
    mask = Image.new("L", (chip_w, chip_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, chip_w, chip_h), radius=pad, fill=255)
    solid = Image.new("RGBA", (chip_w, chip_h), (*CREAM, 225))
    solid.putalpha(mask)
    mx, my = top_left or (int(W * 0.05), int(W * 0.05))
    canvas.alpha_composite(solid, (mx, my))
    canvas.alpha_composite(lg, (mx + pad, my + pad))


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


# ---------- custom cards ----------

def c1_quote_card(p2):
    base = grade(cover(p2, S, S, zoom=1.0, ay=0.30))
    canvas = base.convert("RGBA")
    # bottom forest gradient scrim
    h = S
    col = np.zeros(h, np.float64)
    top = int(h * 0.52); feather = int(h * 0.3)
    for y in range(h):
        col[y] = 0 if y < top - feather else (min(1.0, (y - (top - feather)) / feather))
    alpha = np.clip(col * 235, 0, 255).astype(np.uint8)[:, None].repeat(S, axis=1)
    scrim = Image.new("RGBA", (S, S), (13, 46, 28, 0))
    scrim.putalpha(Image.fromarray(alpha, "L"))
    canvas.alpha_composite(scrim)
    d = ImageDraw.Draw(canvas)
    margin = int(S * 0.09)
    quote = "«فحصت الأرض دي بإيدي»"
    f_q = F(BOLD, 88)
    while d.textlength(quote, font=f_q) > S - 2 * margin and f_q.size > 54:
        f_q = F(BOLD, f_q.size - 4)
    qw = d.textlength(quote, font=f_q)
    qy = int(S * 0.665)
    d.text(((S - qw) / 2, qy), quote, font=f_q, fill=CREAM)
    # terracotta rule
    ry = qy + f_q.size + 34
    d.rectangle((S / 2 - 70, ry, S / 2 + 70, ry + 6), fill=TERRA)
    f_n = F(SEMI, 46)
    name = "خالد ناصر الدين"
    nw = d.textlength(name, font=f_n)
    d.text(((S - nw) / 2, ry + 28), name, font=f_n, fill=CREAM)
    f_t = F(REG, 34)
    title = "رئيس مجلس إدارة باسقات"
    tw = d.textlength(title, font=f_t)
    d.text(((S - tw) / 2, ry + 28 + 62), title, font=f_t, fill=(236, 226, 214))
    logo_chip(canvas)
    save(canvas, OUT, "concept1-founder-quote.png")


def c5_checklist(infra):  # "infra" now the real drone frame, not the old solar photo
    canvas = Image.new("RGBA", (S, S), (*CREAM, 255))
    d = ImageDraw.Draw(canvas)
    margin = 76
    right = S - margin
    # title on its own row, below the logo chip (client 2026-07-02: replaces the old title)
    f_title = F(BOLD, 62)
    title = "مشروعنا جاهز منتظر مشاركتك"
    while d.textlength(title, font=f_title) > S - 2 * margin and f_title.size > 44:
        f_title = F(BOLD, f_title.size - 4)
    rtl_text(d, (right, 236), title, f_title, FOREST)
    d.rectangle((right - 250, 236 + 92, right, 236 + 100), fill=TERRA)
    # client 2026-07-02 verbatim bullets, minus the solar item (Khaled 2026-03-30 reject:
    # "Solar system does not exist inside palm areas" -- no solar claim ships, ever)
    items = ["آبار محفورة وشغالة", "شبكة ري كاملة", "أرض تخصيص مباشر من المحافظة"]
    f_item = F(SEMI, 44)
    y = 408
    row_h = 112  # 3 rows now (solar bullet dropped); widened from 86 to keep the card balanced
    for it in items:
        # check circle on the right
        ccx, ccy, r = right - 34, y + 32, 30
        d.ellipse((ccx - r, ccy - r, ccx + r, ccy + r), fill=FOREST)
        d.line((ccx - 13, ccy + 2, ccx - 4, ccy + 12), fill=CREAM, width=7)
        d.line((ccx - 4, ccy + 12, ccx + 15, ccy - 9), fill=CREAM, width=7)
        rtl_text(d, (right - 86, y + 2), it, f_item, INK)
        y += row_h
        if it != items[-1]:
            d.line((margin, y - 12, right, y - 12), fill=(226, 214, 199), width=2)
    # bottom real-photo strip: real drone aerial (2026-07-03 fix, comment #7 / D4), the
    # same verified-real, people-free, solar-free frame used for C7.
    strip_h = 230
    strip = grade(cover(infra, S - 2 * margin, strip_h, zoom=1.0, ax=0.5, ay=0.35))
    mask = Image.new("L", strip.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, strip.width, strip.height), radius=22, fill=255)
    canvas.paste(strip, (margin, S - strip_h - 66), mask)
    f_cap = F(REG, 27)
    cap = "من أرض الواقع: مزرعة باسقات، الفرافرة"
    capw = d.textlength(cap, font=f_cap)
    d = ImageDraw.Draw(canvas)
    d.text((S - margin - capw, S - 54), cap, font=f_cap, fill=(120, 108, 96))
    logo_chip(canvas, logo_w_frac=0.16)
    save(canvas, OUT, "concept5-infra-checklist.png")


def c2_natural(photo):
    """Client 2026-07-02: drop the desk/office/soil-jars composite, use a fully
    natural, uncomposited real photo. No AI scene, no cutout. Raw only (text
    line comes from the overlay pass)."""
    canvas = grade(cover(photo, S, S, zoom=1.0, ax=0.5, ay=0.38), 1.04, 1.05, 1.01, 1.05)
    save(canvas, RAW, "concept2-due-diligence.png")


def c6_split(photo_src):
    canvas = Image.new("RGBA", (S, S), (*CREAM, 255))
    half = S // 2
    # RIGHT half (read first): the paper
    paper_bg = Image.new("RGB", (half, S), (243, 237, 227))
    canvas.paste(paper_bg, (half, 0))
    d = ImageDraw.Draw(canvas)
    # a tilted white sheet with blurred generic lines
    sheet = Image.new("RGBA", (380, 500), (255, 255, 255, 255))
    sd = ImageDraw.Draw(sheet)
    for i in range(11):
        yy = 60 + i * 38
        wdt = 300 if i % 4 else 210
        sd.rounded_rectangle((380 - 40 - wdt, yy, 380 - 40, yy + 12), radius=6, fill=(186, 186, 186, 255))
    sheet = sheet.rotate(-4, expand=True, fillcolor=(0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shd = ImageDraw.Draw(shadow)
    shd.rounded_rectangle((half + 70, 300, half + 70 + sheet.width - 20, 300 + sheet.height - 20), radius=10, fill=(0, 0, 0, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(sheet, (half + 60, 285))
    # LEFT half: real farm (aerial rows; top-crop keeps the baked subtitle out)
    photo = grade(cover(photo_src, half, S, zoom=1.45, ax=0.5, ay=0.0))
    canvas.paste(photo, (0, 0))
    # divider
    d = ImageDraw.Draw(canvas)
    d.rectangle((half - 4, 0, half + 4, S), fill=TERRA)
    # labels (chips)
    f_lab = F(BOLD, 52)
    for label, cx, dark in (("كلام على ورق", half + half / 2, False), ("أرض شغالة", half / 2, True)):
        lw = d.textlength(label, font=f_lab)
        pad = 26
        bx0, by0 = cx - lw / 2 - pad, 92
        bx1, by1 = cx + lw / 2 + pad, 92 + f_lab.size + 2 * 14
        rounded(d, (bx0, by0, bx1, by1), 18, (*FOREST, 235) if dark else (*CREAM, 235))
        d.text((cx - lw / 2, by0 + 12), label, font=f_lab, fill=CREAM if dark else FOREST)
    logo_chip(canvas, top_left=(int(S * 0.05), S - 200), logo_w_frac=0.17)
    save(canvas, OUT, "concept6-paper-vs-land.png")


def c7_editorial(drone):
    border = 56
    cap_h = 168
    canvas = Image.new("RGBA", (S, S), (252, 250, 246, 255))
    # Client 2026-07-02: real drone still (DJI_0158.mp4 frame, palms-only grid
    # rows, no pivot circle, no bare patches), replaces the rejected pivot-
    # circle aerial. zoom/anchor tuned to crop out the thin sky strip.
    photo = grade(cover(drone, S - 2 * border, S - 2 * border - cap_h, zoom=1.35, ax=0.5, ay=0.6))
    canvas.paste(photo, (border, border))
    d = ImageDraw.Draw(canvas)
    right = S - border - 20
    # kicker chip
    f_k = F(SEMI, 30)
    kick = "توثيق من أرض المشروع"
    kw = d.textlength(kick, font=f_k)
    ky = S - border - cap_h + 26
    rounded(d, (right - kw - 36, ky, right, ky + 52), 12, TERRA)
    d.text((right - kw - 18, ky + 7), kick, font=f_k, fill=CREAM)
    f_c = F(BOLD, 58)
    cap = "من قلب الفرافرة"
    cw = d.textlength(cap, font=f_c)
    d.text((right - cw, ky + 62), cap, font=f_c, fill=FOREST)
    # small logo bottom-left of caption bar
    lg = Image.open(BRAND / "logo-arabic.png").convert("RGBA")
    lw = int(S * 0.15)
    lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
    canvas.alpha_composite(lg, (border + 8, S - border - cap_h + (cap_h - lg.height) // 2))
    save(canvas, OUT, "concept7-editorial-farafra.png")


def c9_chat():
    canvas = Image.new("RGBA", (S, S), (*CREAM, 255))
    d = ImageDraw.Draw(canvas)
    # header band
    d.rectangle((0, 0, S, 128), fill=FOREST)
    f_h = F(BOLD, 46)
    ht = "أسئلة بتوصلنا كل يوم"
    hw = d.textlength(ht, font=f_h)
    d.text((S - 64 - hw, 34), ht, font=f_h, fill=CREAM)
    lg = Image.open(BRAND / "logo-icon-cream.png").convert("RGBA")
    lh = 84
    lg = lg.resize((int(lg.width * lh / lg.height), lh), Image.LANCZOS)
    canvas.alpha_composite(lg, (44, (128 - lh) // 2))
    d = ImageDraw.Draw(canvas)
    bubbles = [
        ("q", "طب وأنا في السعودية.. مين هيتابع الأرض؟"),
        ("a", "الإدارة كلها علينا: زراعة وري وصيانة وحصاد. وانت بيوصلك تقرير موثق كل فترة، وتقدر تزور في أي وقت."),
        ("q", "وأقدر أشوف المزرعة قبل ما أقرر؟"),
        ("a", "أكيد. تعالى زور، أو نبعتلك جولة مصورة من أرض الواقع."),
    ]
    f_b = F(SEMI, 36)
    f_tag = F(REG, 26)
    y = 166
    margin = 56
    for kind, text in bubbles:
        max_bw = int(S * 0.74)
        lines = wrap_rtl(d, text, f_b, max_bw - 64)
        line_h = f_b.size + 16
        bh = 30 * 2 + line_h * len(lines) - 10
        bw = max(d.textlength(ln, font=f_b) for ln in lines) + 64
        if kind == "q":
            x1 = S - margin
            x0 = x1 - bw
            fill = (255, 255, 255, 255)
            tag = "سؤال من متابع"
            tagx = x1
        else:
            x0 = margin
            x1 = x0 + bw
            fill = (223, 240, 216, 255)
            tag = "رد باسقات"
            tagx = x0 + d.textlength(tag, font=f_tag)
        tw_ = d.textlength(tag, font=f_tag)
        d.text((tagx - tw_, y), tag, font=f_tag, fill=(146, 134, 120))
        by0 = y + 36
        rounded(d, (x0, by0, x1, by0 + bh), 24, fill, outline=(224, 213, 198), width=2)
        ty = by0 + 22
        for ln in lines:
            lnw = d.textlength(ln, font=f_b)
            d.text((x1 - 32 - lnw, ty), ln, font=f_b, fill=INK)
            ty += line_h
        y = by0 + bh + 26
    # bottom CTA pill, clear of the last bubble
    f_cta = F(BOLD, 38)
    cta = "ابدأ محادثة واسأل"
    cw = d.textlength(cta, font=f_cta)
    pw, ph = cw + 96, 80
    px, py = (S - pw) / 2, max(y + 14, S - ph - 40)
    rounded(d, (px, py, px + pw, py + ph), int(ph / 2), FOREST)
    d.text(((S - cw) / 2, py + 17), cta, font=f_cta, fill=CREAM)
    save(canvas, OUT, "concept9-whatsapp-card.png")


def c10_remittance(medj):
    canvas = Image.new("RGBA", (S, S), (*CREAM, 255))
    half = S // 2
    d = ImageDraw.Draw(canvas)
    # RIGHT panel (read first): transfers get spent
    f_lab = F(BOLD, 50)
    lab1 = "التحويل بيتصرف"
    lw1 = d.textlength(lab1, font=f_lab)
    d.text((half + (half - lw1) / 2, 110), lab1, font=f_lab, fill=FOREST)
    # fading coins with down arrows
    cx = half + half / 2
    alpha_steps = [255, 150, 70]
    ys = [300, 480, 660]
    coin_r = 64
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for a, yy in zip(alpha_steps, ys):
        ld.ellipse((cx - coin_r, yy - coin_r, cx + coin_r, yy + coin_r), outline=(*TERRA, a), width=10)
        sym = "ج.م"
        f_sym = F(SEMI, 40)
        sw = ld.textlength(sym, font=f_sym)
        ld.text((cx - sw / 2, yy - 26), sym, font=f_sym, fill=(*TERRA, a))
        if yy != ys[-1]:
            ld.line((cx, yy + coin_r + 14, cx, yy + coin_r + 74), fill=(*TERRA, max(60, a - 60)), width=8)
            ld.polygon([(cx - 16, yy + coin_r + 66), (cx + 16, yy + coin_r + 66), (cx, yy + coin_r + 96)], fill=(*TERRA, max(60, a - 60)))
    canvas.alpha_composite(layer)
    d = ImageDraw.Draw(canvas)
    f_small = F(SEMI, 34)
    s1 = "بيخلص أول بأول"
    sw1 = d.textlength(s1, font=f_small)
    d.text((half + (half - sw1) / 2, 786), s1, font=f_small, fill=(104, 90, 76))
    # LEFT panel: the asset stays (real palms)
    photo = grade(cover(medj, half, S, zoom=1.1, ax=0.5, ay=0.45))
    canvas.paste(photo, (0, 0))
    d = ImageDraw.Draw(canvas)
    # dark band at left panel bottom + label
    band = Image.new("RGBA", (half, 220), (13, 46, 28, 0))
    ba = np.linspace(0, 210, 220).astype(np.uint8)[:, None].repeat(half, axis=1)
    band.putalpha(Image.fromarray(ba, "L"))
    canvas.alpha_composite(band, (0, S - 220))
    d = ImageDraw.Draw(canvas)
    lab2 = "الأصل بيفضل"
    lw2 = d.textlength(lab2, font=f_lab)
    d.text(((half - lw2) / 2, S - 130), lab2, font=f_lab, fill=CREAM)
    # divider
    d.rectangle((half - 4, 0, half + 4, S), fill=TERRA)
    logo_chip(canvas, top_left=(int(S * 0.04), int(S * 0.04)), logo_w_frac=0.16)
    bot = "باسقات. مشروع نخيل مجدول في الفرافرة"
    f_bot = F(REG, 28)
    bw = d.textlength(bot, font=f_bot)
    d.text((half + (half - bw) / 2, S - 64), bot, font=f_bot, fill=(140, 126, 112))
    save(canvas, OUT, "concept10-remittance-asset.png")


def c13_milestone():
    canvas = Image.new("RGBA", (S, S), (*FOREST, 255))
    d = ImageDraw.Draw(canvas)
    # top chip
    f_chip = F(SEMI, 34)
    chip = "رقم حقيقي، من غير زعيق"
    cw = d.textlength(chip, font=f_chip)
    pad = 26
    cx0 = (S - cw) / 2 - pad
    rounded(d, (cx0, 96, cx0 + cw + 2 * pad, 96 + 64), 16, TERRA)
    d.text(((S - cw) / 2, 96 + 11), chip, font=f_chip, fill=CREAM)
    # huge placeholder number
    f_big = F(BOLD, 320)
    big = "؟؟%"
    bw = d.textlength(big, font=f_big)
    d.text(((S - bw) / 2, 250), big, font=f_big, fill=CREAM)
    f_line = F(BOLD, 60)
    line = "من المرحلة الأولى اتحجزت"
    lw = d.textlength(line, font=f_line)
    d.text(((S - lw) / 2, 660), line, font=f_line, fill=CREAM)
    f_sub = F(REG, 34)
    sub = "والباقي متاح، والتفاصيل في دليل باسقات"
    sw = d.textlength(sub, font=f_sub)
    d.text(((S - sw) / 2, 760), sub, font=f_sub, fill=(226, 216, 202))
    # cream palm icon bottom center, then the note above it
    lg = Image.open(BRAND / "logo-icon-cream.png").convert("RGBA")
    lh = 74
    lg = lg.resize((int(lg.width * lh / lg.height), lh), Image.LANCZOS)
    canvas.alpha_composite(lg, (int((S - lg.width) / 2), S - lh - 40))
    f_note = F(REG, 26)
    note = "الرقم النهائي بيتأكد قبل النشر"
    nw = d.textlength(note, font=f_note)
    d.text(((S - nw) / 2, S - lh - 40 - 52), note, font=f_note, fill=(196, 186, 172))
    save(canvas, OUT, "concept13-milestone.png")


def c14_plain():
    canvas = Image.new("RGBA", (S, S), (*CREAM, 255))
    d = ImageDraw.Draw(canvas)
    f_big = F(BOLD, 120)
    l1, l2 = "فلوسك", "بتأكل نفسها؟"
    w1 = d.textlength(l1, font=f_big)
    w2 = d.textlength(l2, font=f_big)
    d.text(((S - w1) / 2, 300), l1, font=f_big, fill=FOREST)
    d.text(((S - w2) / 2, 452), l2, font=f_big, fill=FOREST)
    d.rectangle((S / 2 - 90, 640, S / 2 + 90, 648), fill=TERRA)
    f_sub = F(SEMI, 38)
    sub = "باسقات. نخيل مجدول شغال في الفرافرة"
    sw = d.textlength(sub, font=f_sub)
    d.text(((S - sw) / 2, 690), sub, font=f_sub, fill=TERRA)
    logo_chip(canvas, logo_w_frac=0.17)
    save(canvas, OUT, "concept14-plain-hook.png")


def main():
    p1 = load(IMG / "founder-khaled-farm.webp")     # arms out, whole natural photo for C2
    p2_path = IMG / "khaled-founder-2.webp"          # arms crossed (composites cleanly)
    p2 = load(p2_path)
    medj = load(IMG / "medjool-diff-asset.webp")
    drone = load(BASE / "assets/source/drone-real-DJI_0158-t6.jpg")  # real palms-only frame, C7 + C5

    scene_c3 = load(GEN / "scene-c3-golden-rows.png")
    scene_c4 = load(GEN / "scene-c4-open-gate.png")
    scene_c8 = load(GEN / "scene-c8-departure.png")
    scene_c12 = load(GEN / "scene-c12-medjool-macro.png")

    aer2 = load(IMG / "farm-aerial-ready-thumb.webp")
    scene_c4v2 = load(GEN / "scene-c4-open-gate-v2.png")

    print("custom cards...")
    c1_quote_card(p2)
    c5_checklist(drone)
    c6_split(aer2)
    c7_editorial(drone)
    c9_chat()
    c10_remittance(medj)
    c13_milestone()
    c14_plain()

    print("founder cutout (rembg)...")
    per = cutout(p2_path)

    print("composites + photo raws for the overlay pass...")
    # C2: client 2026-07-02 rejected the desk/office/jars composite; fully
    # natural, uncomposited real photo instead (no cutout, no AI scene).
    c2_natural(p1)
    # C3: waist-up on the golden path, anchored to the bottom edge (client
    # 2026-07-02: don't cut the body mid-frame, bring it down flush with the
    # bottom). Bigger and pushed down vs the v1 params, so the crop runs off
    # the canvas bottom instead of floating with empty scene below it.
    bg3 = grade(cover(scene_c3, S, S), 1.04, 1.05, 1.0, 1.0)
    save(composite_waist(warm(per, 1.09, 0.90, 0.97), bg3, width_frac=0.66, cx=0.40, top_frac=0.22), RAW, "concept3-owner-land.png")
    # C4 (board revision): the open gate scene itself, NO composite; palms
    # visible through the gateway carry the metaphor.
    save(grade(cover(scene_c4v2, S, S), 1.03, 1.05), RAW, "concept4-open-gate.png")
    # C8: departure lounge (crop right-ward to drop the far-left seating blobs)
    save(grade(cover(scene_c8, S, S, zoom=1.12, ax=0.85, ay=0.5), 1.03, 1.02), RAW, "concept8-departure.png")
    # C11: pension photo card (dimmed real palms; overlay adds the line)
    dimmed = ImageEnhance.Brightness(grade(cover(medj, S, S, zoom=1.08, ay=0.4))).enhance(0.72)
    save(dimmed, RAW, "concept11-pension.png")
    # C12: medjool macro
    save(grade(cover(scene_c12, S, S), 1.02, 1.03), RAW, "concept12-medjool-macro.png")


if __name__ == "__main__":
    main()
