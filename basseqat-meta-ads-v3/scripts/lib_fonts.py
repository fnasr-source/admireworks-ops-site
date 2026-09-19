#!/usr/bin/env python3
"""
Font resolution + Arabic shaping gate for the Basseqat static creative builds.

TWO JOBS
--------
1. ensure_ttf()      Guarantee the six Madani Arabic .ttf weights exist, regenerating
                     them from the repo .woff2 if they are missing or stale. This is
                     what stops the v2 failure mode (a hardcoded scratchpad font path
                     that evaporated between sessions).

2. assert_shaping()  Refuse to build unless Arabic will actually render correctly.

THE SHAPING FORK (read this before "fixing" anything)
-----------------------------------------------------
There are two mutually exclusive ways to draw Arabic with Pillow, and the repo
contains documentation for BOTH because they belong to different toolchains:

  A. Pillow built WITH libraqm  ->  pass RAW LOGICAL Arabic straight to draw.text().
     libraqm does shaping + bidi internally. Pre-processing with arabic_reshaper /
     python-bidi DOUBLE-APPLIES and produces scrambled glyphs.
     Source: basseqat-meta-ads-v1/scripts/overlay_arabic_logo.py docstring, and the
     v2 Agent Log, which records this as a real bug that was caught and fixed.

  B. Pillow built WITHOUT libraqm  ->  you MUST pre-shape with arabic_reshaper +
     python-bidi, because Pillow will otherwise draw disconnected letters in
     visual-LTR order.
     Source: .claude/skills/client-meta-renovation/SKILL.md (its toolchain is
     Noto Sans Arabic on a no-raqm Pillow).

These produce DIFFERENT PIXELS. A wave built half on one path and half on the
other is silently inconsistent, so this module HARD-FAILS on a no-raqm box rather
than quietly branching. Escape hatch for someone who genuinely cannot install
libraqm: BASSEQAT_ARABIC_FALLBACK=reshaper (prints a loud banner, stamps the wave
so the mismatch is traceable, and makes the visual Arabic verification mandatory).

The check is not just features.check('raqm'), which only reports the capability.
It renders the lam-alef ligature and asserts it measures NARROWER than its two
component letters drawn separately. If shaping were absent or bypassed, those two
measurements would be equal. That proves shaping is applied, not merely available.
"""

import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, features

AW_ROOT = Path("/Users/user/Documents/IDE Projects/Admireworks Internal OS")
FONTS_DIR = AW_ROOT / "assets" / "fonts" / "madani-arabic-ttf"
CONVERTER = AW_ROOT / "scripts" / "build-madani-ttf.py"

WEIGHTS = ("ExtraLight", "Light", "Regular", "Medium", "SemiBold", "Bold")

FALLBACK_ENV = "BASSEQAT_ARABIC_FALLBACK"

# --------------------------------------------------------------------------- kerning
#
# MADANI ARABIC'S `kern` FEATURE MUST BE DISABLED. This is not a preference.
#
# The font's GPOS `kern` feature inserts a POSITIVE kern after every non-joining
# Arabic letter (ا أ إ آ د ذ ر ز و ؤ ة ى). Those letters never connect to the
# following letter, so the shaper already leaves a small gap there; the kern
# feature widens it until it reads as a WORD SPACE. The result is that ordinary
# words visibly split:
#
#     جاية   ->  "جا ية"
#     بيدير  ->  "بيد ير"
#     إيه    ->  "إ يه"
#
# A non-Arabic reader does not see this. A native reader sees a broken word
# immediately, and the first native reviewer to look at the rendered creatives
# flagged exactly this, on exactly the row where it was worst.
#
# Verified: `textlength("جاية")` is 76.39px with the feature on and 71.34px with
# it off at 38px, and the rendered gap closes completely. Also verified that the
# woff2 -> ttf conversion is NOT the cause: `fontTools` reports byte-identical
# GDEF/GPOS/GSUB tables and the same feature list in both, so the behaviour is
# intrinsic to the font as shipped.
#
# Every draw and every measurement in this pipeline goes through here, because a
# measurement taken WITH kern and a draw made WITHOUT it would mis-position text
# and silently defeat the safe-zone assertions.
ARABIC_FEATURES = ["-kern"]


# --------------------------------------------------------------------------- fonts

def ensure_ttf() -> Path:
    """Return FONTS_DIR, regenerating any missing weight first. Idempotent."""
    missing = [w for w in WEIGHTS if not (FONTS_DIR / f"MadaniArabic-{w}.ttf").exists()]
    if missing:
        print(f"[lib_fonts] regenerating {len(missing)} missing weight(s): {', '.join(missing)}")
        subprocess.run([sys.executable, str(CONVERTER)], check=True)

    still = [w for w in WEIGHTS if not (FONTS_DIR / f"MadaniArabic-{w}.ttf").exists()]
    if still:
        raise RuntimeError(
            f"Madani weights still missing after regeneration: {still}\n"
            f"Run: python3 {CONVERTER}"
        )
    return FONTS_DIR


def F(weight: str, size: int) -> ImageFont.FreeTypeFont:
    """Load a Madani weight at a pixel size. Weight is one of WEIGHTS."""
    return ImageFont.truetype(str(FONTS_DIR / f"MadaniArabic-{weight}.ttf"), size)


def BOLD(size: int) -> ImageFont.FreeTypeFont:
    return F("Bold", size)


def SEMI(size: int) -> ImageFont.FreeTypeFont:
    return F("SemiBold", size)


def REG(size: int) -> ImageFont.FreeTypeFont:
    return F("Regular", size)


def LIGHT(size: int) -> ImageFont.FreeTypeFont:
    return F("Light", size)


# ------------------------------------------------------------------------ shaping

def shaping_mode() -> str:
    """'raqm' (the correct path) or 'reshaper-fallback' (explicitly opted into)."""
    if os.environ.get(FALLBACK_ENV) == "reshaper":
        return "reshaper-fallback"
    return "raqm"


def assert_shaping() -> str:
    """
    Hard gate. Returns the shaping mode string to stamp into wave.json.
    Raises RuntimeError with remediation on any failure.
    """
    mode = shaping_mode()

    if mode == "reshaper-fallback":
        print("=" * 78, file=sys.stderr)
        print("  WARNING: Arabic shaping is running on the RESHAPER FALLBACK path.", file=sys.stderr)
        print("  Pixels will NOT match a raqm build. Visual verification of every", file=sys.stderr)
        print("  rendered Arabic string is MANDATORY before this wave ships.", file=sys.stderr)
        print("=" * 78, file=sys.stderr)
        import arabic_reshaper  # noqa: F401  (fail loudly here if unavailable)
        import bidi  # noqa: F401
        return mode

    if not features.check("raqm"):
        raise RuntimeError(
            "Pillow was built WITHOUT libraqm, so Arabic will render as disconnected\n"
            "letters in the wrong order. Fix the toolchain rather than switching paths:\n"
            "    brew install libraqm harfbuzz fribidi\n"
            "    pip install --force-reinstall --no-binary :all: Pillow\n"
            f"Deliberate override (produces different pixels): {FALLBACK_ENV}=reshaper"
        )

    ensure_ttf()

    # Prove shaping is APPLIED, not merely available. The lam-alef ligature (لا) is a
    # single glyph when shaped, and two separate glyphs when not. Its advance width
    # must therefore be strictly less than lam + alef measured independently.
    draw = ImageDraw.Draw(Image.new("RGB", (16, 16)))
    font = BOLD(96)
    ligature = draw.textlength("لا", font=font)          # لا
    separate = draw.textlength("ل", font=font) + draw.textlength("ا", font=font)

    if not ligature < separate:
        raise RuntimeError(
            f"raqm reports available but shaping is NOT being applied "
            f"(lam-alef={ligature:.1f}px, lam+alef={separate:.1f}px; expected ligature < parts).\n"
            "Something is bypassing the layout engine. Do not build."
        )

    # Regression guard for the broken-kern bug. «جاية» contains an alef, which
    # never joins forward, and is exactly where Madani's kern feature inserts a
    # word-sized gap. If ARABIC_FEATURES ever stops being applied, or the font is
    # replaced with one whose kern is sane, this assertion is the thing that says
    # so out loud instead of shipping «جا ية» to a paid ad again.
    kerned = draw.textlength("جاية", font=font)
    tightened = draw.textlength("جاية", font=font, features=ARABIC_FEATURES)
    if not tightened < kerned:
        raise RuntimeError(
            f"Madani kern regression check did not fire: 'جاية' measures "
            f"{tightened:.1f}px with ARABIC_FEATURES and {kerned:.1f}px without.\n"
            "Expected the tightened width to be SMALLER. Either the feature list is\n"
            "no longer reaching the shaper, or the font changed. Do not build until\n"
            "you have visually confirmed that «جاية» renders as one word."
        )

    print(
        f"[lib_fonts] shaping OK: raqm {features.version('raqm')}, "
        f"lam-alef {ligature:.1f}px < lam+alef {separate:.1f}px, "
        f"kern suppressed ({tightened:.1f}px < {kerned:.1f}px on «جاية»)"
    )
    return mode


def shape(text: str) -> str:
    """
    The ONLY place text is prepared for drawing.

    On the raqm path this is deliberately the identity function: passing raw logical
    Arabic is correct, and reshaping here would scramble the output. On the fallback
    path it applies reshaper + bidi. Call this everywhere so the branch lives once.
    """
    if shaping_mode() == "raqm":
        return text
    import arabic_reshaper
    from bidi.algorithm import get_display
    return get_display(arabic_reshaper.reshape(text))


if __name__ == "__main__":
    ensure_ttf()
    mode = assert_shaping()
    print(f"[lib_fonts] selftest PASS (mode={mode}, fonts={FONTS_DIR})")
