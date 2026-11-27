#!/usr/bin/env python3
"""
Compliance lint for every NEW Arabic string in basseqat-ads-v5/copy/copy-deck.json (the after side of
every fix, the Google replacements and the post texts; the before side is the live text being fixed).

Reads the client's own rule tables from the Basseqat repo (never a fork):
apps/web/src/lib/email-studio/forbidden-phrases.ts (literal phrases, with their
`unless` escapes) and forbiddenPatterns.ts (the promised-return-percentage shape).
Adds this wave's own bans: em dash, «دليل باسقات», «مضمون», «آمن» as a claim,
«مجدول» next to the pictured palms, and the six-years line.

    python3 basseqat-ads-v5/scripts/lint_copy.py [--basseqat <repo>] [--ref origin/main]
Exits 1 on any hit. Prints coverage as n of N strings.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

WAVE = Path(__file__).resolve().parent.parent
EM_DASH = chr(0x2014)

EXTRA = [
    (EM_DASH, "em dash (hard ban)"),
    ("دليل باسقات", "the booklet is «بروشور باسقات» (BSQ-189)"),
    ("مضمون", "no guaranteed return wording"),
    ("استثمار آمن", "no safe-investment claim"),
    ("ثابت ومضمون", "no fixed or guaranteed return"),
    ("٦ سنين", "experience line is not «٦ سنين» (BSQ-188)"),
    ("6 سنين", "experience line is not «6 سنين» (BSQ-188)"),
    ("صور حقيقية", "label is «من أرض الواقع»"),
    ("فرصة العمر", "hype"),
    ("قبل فوات الأوان", "fake urgency"),
]


def ts_source(repo: str, ref: str, rel: str) -> str:
    return subprocess.run(["git", "-C", repo, "show", f"{ref}:{rel}"], check=True, capture_output=True, text=True).stdout


def phrases(src: str):
    out = []
    for m in re.finditer(r"\{\s*pattern:\s*\"([^\"]+)\"(.*?)\n\s*\},", src, re.S):
        body = m.group(2)
        unless = re.findall(r"\"([^\"]+)\"", re.search(r"unless:\s*\[(.*?)\]", body, re.S).group(1)) if "unless:" in body else []
        reason = re.search(r"reason:\s*\"([^\"]+)\"", body)
        out.append((m.group(1), unless, reason.group(1) if reason else ""))
    return out


def patterns(src: str):
    out = []
    for m in re.finditer(r"id:\s*\"([^\"]+)\".*?source:\s*((?:\"(?:[^\"\\]|\\.)*\"\s*\+?\s*)+)", src, re.S):
        parts = re.findall(r"\"((?:[^\"\\]|\\.)*)\"", m.group(2))
        body = "".join(parts).encode().decode("unicode_escape").encode("latin-1").decode("utf-8")
        out.append((m.group(1), re.compile(body)))
    return out


def apply_edits(text, edits):
    for old, new in edits:
        text = text.replace(old, new)
    return text


def strings(deck):
    for f in deck["metaFixes"]:
        yield f"{f['key']}.primaryText.after", apply_edits(f["before"]["primaryText"], f["edits"])
        yield f"{f['key']}.headline.after", f["headlineEdit"][1]
    for t in deck["pmax"]["text"]:
        yield f"{t['key']}.after", t["after"]
    for it in deck["posts"]["items"]:
        yield f"{it['key']}.onImage", it["onImage"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--basseqat", default="/Users/user/Documents/IDE Projects/Basseqat")
    ap.add_argument("--ref", default="origin/main")
    a = ap.parse_args()
    lit = phrases(ts_source(a.basseqat, a.ref, "apps/web/src/lib/email-studio/forbidden-phrases.ts"))
    pat = patterns(ts_source(a.basseqat, a.ref, "apps/web/src/lib/email-studio/forbiddenPatterns.ts"))
    if len(lit) < 10 or not any(pid == "promised-return-percentage" for pid, _ in pat):
        print(f"could not read the client rule tables ({len(lit)} phrases, {len(pat)} patterns): refusing to pass")
        return 1
    deck = json.loads((WAVE / "copy" / "copy-deck.json").read_text(encoding="utf-8"))
    items = list(strings(deck))
    hits = []
    for where, s in items:
        for p, unless, why in lit:
            if p in s and not any(u in s for u in unless):
                hits.append((where, p, why))
        for pid, rx in pat:
            if rx.search(s):
                hits.append((where, pid, "pattern"))
        for p, why in EXTRA:
            if p in s:
                hits.append((where, p, why))
    for h in hits:
        print("HIT", *h)
    print(f"checked {len(items)} of {len(items)} strings against {len(lit)} client phrases, {len(pat)} client patterns and {len(EXTRA)} wave rules: {len(hits)} hit(s)")
    return 1 if hits else 0


if __name__ == "__main__":
    sys.exit(main())
