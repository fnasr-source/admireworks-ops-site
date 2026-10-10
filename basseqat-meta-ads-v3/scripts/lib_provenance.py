#!/usr/bin/env python3
"""
Source-image provenance ledger for the Basseqat static creative builds.

THE FAILURE THIS PREVENTS
-------------------------
The v2 Agent Log records that a "SAFE backgrounds" list written into the plan doc
was wrong on EVERY entry: four files listed as safe scenery each turned out to
contain unverified people when someone finally opened them. The list was a list
of FILENAMES, written once, trusted thereafter.

So this ledger has three properties the old list did not:

  1. It is keyed on the sha256 of the FILE BYTES, not the filename. Swap a file's
     contents and the hash stops matching and the build fails, instead of
     silently shipping something nobody looked at.

  2. It carries TWO INDEPENDENT VERDICTS. `ai` is the cheap screening pass and is
     advisory only. `visual` is an agent that actually opened the image at full
     resolution. Only `visual.verdict == "SAFE"` authorises use. A row with a
     glowing `ai` verdict and no `visual` block is NOT cleared.

  3. require_safe() is called by the build itself, so an unverified byte cannot
     reach a rendered creative even by accident.

WHAT "SAFE" MEANS FOR THIS WAVE
-------------------------------
  * ZERO humans. Any human at all: partial limbs, distant figures, people seen
    from behind, reflections, a human shadow. We deliberately do NOT do face
    identification, because a no-humans rule means we never have to ask whether
    a given face is Dr Ayman El-Nems (permanently blocked) or Khaled Nasseredin
    (blocked since 2026-07-20) or Islam Darwish (permitted).
  * ZERO solar panels anywhere in frame, including background. Standing client
    rejection, Khaled 2026-03-30.
  * ZERO AI-generated pixels. Client directive, 2026-08-04.
  * On-product: this is a MEDJOOL DATE PALM farm. The `الصور` Drive folder is
    largely a herb/vegetable operation under pivot irrigation, which is real
    footage of a real farm but is NOT the product being sold. Using it would
    fail the product-truth gate in front of an audience whose loudest objection
    is already «تعددت طرق النصب والهدف واحد».
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

WAVE = Path(__file__).resolve().parent.parent
SOURCE_DIR = WAVE / "assets" / "source"
LEDGER = SOURCE_DIR / "PROVENANCE.jsonl"
LEDGER_MD = SOURCE_DIR / "PROVENANCE.md"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_ledger() -> dict[str, dict]:
    """sha256 -> row."""
    if not LEDGER.exists():
        return {}
    rows = {}
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        rows[row["sha256"]] = row  # later rows win, the file is append-only
    return rows


def append(row: dict) -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    with open(LEDGER, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def record(path: Path, *, drive_file_id: str | None, drive_name: str | None,
           visual_verdict: str, checked_by: str, notes: str,
           ai: dict | None = None, used_in: list[str] | None = None) -> dict:
    p = Path(path)
    from PIL import Image
    with Image.open(p) as im:
        w, h = im.size
    row = {
        "sha256": sha256_file(p),
        "driveFileId": drive_file_id,
        "driveName": drive_name,
        "localPath": str(p.relative_to(WAVE)) if str(p).startswith(str(WAVE)) else str(p),
        "w": w, "h": h,
        "ai": ai,
        "visual": {
            "verdict": visual_verdict,          # SAFE | BLOCKED
            "checkedBy": checked_by,
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "notes": notes,
        },
        "usedIn": used_in or [],
    }
    append(row)
    return row


class UnverifiedSourceError(RuntimeError):
    pass


def require_safe(path) -> Path:
    """
    Gate every source image the build opens. Recomputes the hash from the bytes
    on disk, so this cannot be satisfied by a filename alone.
    """
    p = Path(path)
    if not p.exists():
        raise UnverifiedSourceError(f"source image not found: {p}")

    digest = sha256_file(p)
    ledger = load_ledger()
    row = ledger.get(digest)

    if row is None:
        raise UnverifiedSourceError(
            f"{p.name} (sha256 {digest[:12]}) is NOT in {LEDGER.name}.\n"
            "Open it at full resolution, judge it against the no-humans / no-solar /\n"
            "no-AI / on-product rules, then record a verdict with lib_provenance.record().\n"
            "The build will not open an image nobody has looked at."
        )

    verdict = (row.get("visual") or {}).get("verdict")
    if verdict != "SAFE":
        raise UnverifiedSourceError(
            f"{p.name} is in the ledger but its visual verdict is {verdict!r}, not 'SAFE'.\n"
            f"notes: {(row.get('visual') or {}).get('notes', '')}"
        )
    return p


def regenerate_md() -> None:
    """Human-readable mirror, so a person or a fresh agent can read the ledger
    without a parser and without being tempted to re-trust a stale list."""
    rows = list(load_ledger().values())
    rows.sort(key=lambda r: (r["visual"]["verdict"], r.get("localPath") or ""))
    lines = [
        "# Basseqat static wave, source-image provenance",
        "",
        "Generated from `PROVENANCE.jsonl`. Do not edit by hand; the JSONL is the record.",
        "",
        "`ai` is the cheap screening pass and is ADVISORY. Only a `visual` verdict of",
        "SAFE authorises use, and `lib_provenance.require_safe()` enforces that at build",
        "time against the sha256 of the actual bytes.",
        "",
        "| verdict | file | dims | checked by | notes | used in |",
        "|---|---|---|---|---|---|",
    ]
    for r in rows:
        v = r["visual"]
        lines.append(
            f"| {v['verdict']} | `{r.get('localPath') or r.get('driveName')}` | "
            f"{r['w']}x{r['h']} | {v['checkedBy']} | {v['notes']} | "
            f"{', '.join(r.get('usedIn') or []) or '-'} |"
        )
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    LEDGER_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    regenerate_md()
    led = load_ledger()
    safe = sum(1 for r in led.values() if r["visual"]["verdict"] == "SAFE")
    print(f"{len(led)} rows, {safe} SAFE -> {LEDGER_MD}")
