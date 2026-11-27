# Basseqat ads v3: replacement for «GCC | C8 departure» (BSQ-187, board card B11)

Client review page for the creative that replaces the live Meta ad «GCC | C8 departure»
(`52553091092472`, ad set GCC Expats `52540611423072`), plus optional replacements for the
two smaller flagged ads (Meta «التخطيط الصح» `52544806777472`, Google PMax image
«Basseqat C4 open-gate» `384973007016`). Nothing here touches an ad account; the swap runs
through `meta-ad-execute` / `google-ad-execute` after the client approves on the page.

- `copy/copy-deck.json`: the only source of on-image text and ad text.
- `assets/source/PROVENANCE.jsonl`: every source photo by sha256, its visual verdict and the
  crop windows it may use. Real Basseqat photos only, zero people, no image model.
- `scripts/build.py`: renders `assets/creatives/` (1:1, 4:5, 9:16 per Meta concept; PMax
  square, landscape, portrait) with the basseqat-meta-ads-v3 font and canvas libraries.
- `scripts/lint_copy.py`: the client's own forbidden-phrase tables plus this wave's bans.
- `scripts/build_page.py`: renders `review.html` from the deck. `index.html` is the redirect
  stub to the page's link on pages.admireworks.com (the page itself lives in `opsPages`).

```bash
python3 basseqat-ads-v3/scripts/lint_copy.py
python3 basseqat-ads-v3/scripts/build.py          # needs numpy and a raqm Pillow
python3 basseqat-ads-v3/scripts/build_page.py
cd apps/client-portal && node --experimental-strip-types --import ./scripts/loaders/register-app-script.mjs \
  scripts/publish-ops-page.mts --dir ../../basseqat-ads-v3 --slug basseqat-ads-v3 --entry review.html \
  --kind approval --client-id <Basseqat portal client id> --reason "..." --expected-version <n>
```

Decisions and comments: `adApprovalFeedback/basseqat-ads-v3` (item keys `concept-a` to
`concept-d` and `apply-all`; values approve, changes, reject, hold).
