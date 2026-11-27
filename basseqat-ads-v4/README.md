# Basseqat ads v4: «الغربة» replacement on the client's 5 Nov brief (BSQ-242, Desk AWD-PHSP)

Eman rejected v3's farm-photo concept A on 5 Nov and asked for a new design: about being abroad
(farm photos not required), REAL people, never AI, who read as Egyptians living abroad, and creative.
The live ad «GCC | C8 departure» (`52553091092472`, ad set GCC Expats `52540611423072`) keeps running
and funded until a replacement is approved (her words). Owner, 8 Nov: real photos with NO recognisable
face, because stock gives no model releases.

- `copy/copy-deck.json`: the only source of on-image text and ad text. The body is v3 concept A's
  reviewed text; only the opening line changes per concept.
- `assets/source/PROVENANCE.jsonl`: each Unsplash photo by sha256, page URL, photographer, licence,
  visual verdict and allowed crop windows (the airport photo's window excludes the airline signage).
  The photos stay out of git; each row carries its download URL.
- `scripts/build.py`: renders `assets/creatives/` (1:1, 4:5, 9:16 per concept) with the
  basseqat-meta-ads-v3 font and canvas libraries. No image model anywhere.
- `scripts/lint_copy.py`: the client's own forbidden-phrase tables plus this wave's bans.
- `scripts/build_page.py`: renders `review.html`. Decisions and comments:
  `adApprovalFeedback/basseqat-ads-v4` (`concept-a`..`concept-c`, `apply-all`).

```bash
export BASSEQAT_REPO=/path/to/basseqat          # fonts and brand logo (defaults to the Mac path)
python3 scripts/build-madani-ttf.py             # once per machine
python3 basseqat-ads-v4/scripts/lint_copy.py --basseqat "$BASSEQAT_REPO" --ref origin/main
python3 basseqat-ads-v4/scripts/build.py
python3 basseqat-ads-v4/scripts/build_page.py
scripts/ops.sh --cwd apps/client-portal node scripts/publish-ops-page.mjs --dir ../../basseqat-ads-v4 \
  --slug basseqat-ads-v4 --entry review.html --kind approval --client-id IWvO6Ct67XFWztaufyeT --reason "..."
```

Nothing here touches an ad account. After the client picks, the new ad is built PAUSED and goes live
only on the owner's word (`meta-ad-execute`).
