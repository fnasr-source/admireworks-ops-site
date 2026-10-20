# Basseqat static retargeting creatives, August 2026

8 concepts x 3 ratios = **24 finished PNGs**, plus 8 simulated square-crop proofs.

Portal deliverable: `campaignReviewDeliverables/basseqat-statics-2026-08`
(seeded **internal / draft**, v1, 2026-08-05).

## Why this wave exists

Khaled, client group, 2026-08-03:

> «لا انا مش عايز اطلع بصورتي في اي اعلانات خالص لكن ده مش معناه ان ما نعملش ريماركتينج… انا حاليا منتظر منكم تشغيل اعلانات remarketing من تاني بافكار تانية غير اني اظهر فيها.»

The 2026-08-04 Fouad/Esraa call (Fathom `FoMChsG84B86Zl4xt5EB`) split the answer:
a **video track** that goes to the client for approval, and a **static track**
that runs while that waits. Sally told the client group the same day:
«إحنا حاليا شغالين علي حاجات Static نشغل بيها ال campaigns». This is that track.

## Hard rules held

| Rule | Source |
|---|---|
| No AI-generated imagery anywhere | client directive, 2026-08-04 |
| No people in any frame | rather than face-match Ayman/Khaled/Islam, the rule is zero humans |
| No solar array in any rendered image | standing rejection, Khaled 2026-03-30 |
| Farm age is 6+ years, never four | client correction, June 2026 |
| No price or promised return on any burned string | compliance |
| Egyptian colloquial only | StoryOS brief section 6 |

## What is different from v1/v2

1. **No image model was invoked.** Stage A of the old pipeline does not exist here.
2. **No Arabic literals in the build script.** Every burned string comes from
   `copy/copy-deck-v3.json`, so `scripts/lint_copy.mjs` transitively lints the
   pixels. `build_v2.py` hardcoded its Arabic inline, so nothing ever linted what
   actually shipped.
3. **Three sizes, and they are enforced.** All three canvases are 1080 wide with
   a ~950px safe band, so the layout is authored once and offset per canvas.
   `assert_safe()` fails the build if any text or logo escapes the band, drops
   under the 120px logo minimum, or gets composited over by a later element.
4. **Sources are gated by hash.** `assets/source/PROVENANCE.jsonl` is keyed on
   sha256 with two independent verdicts; only a human/agent `visual: SAFE`
   authorises use, and the build refuses anything else.
5. **Fonts self-heal.** `assets/fonts/madani-arabic-ttf/` is regenerated on
   demand from the repo `.woff2` by `scripts/build-madani-ttf.py`. The v2 build
   cannot be re-run today because its font path was a scratch directory.

## Two defects this pipeline caught that v2 would have shipped

- The cream logo chip was composited **after** the headline and painted over it,
  erasing the hamza of «أرض» and the dot of its ض, turning the word into «ارص».
  Both boxes were individually inside the safe band, so a bounds-only check
  passed it. Now a draw-order collision check fails the build.
- The sharia card's centred headline overflowed the 9:16 right inset, because
  9:16 reserves 120px for the Reels icon rail and centring on the canvas
  midpoint ignores that. `Canvas.center_x` centres on the safe box instead.

## Asset reality (worth knowing before the next wave)

The client's Drive holds 370 stills. Screening all of them found:

| pool | result |
|---|---|
| `نماء باسقات/الصور`, 223 photos | a **herb / vegetable operation** under pivot irrigation, plus posed group shots. Real, but **not the product being sold**. Zero usable palm frames. |
| `Basseqat photos`, 147 photos | one site-visit walkthrough, 2026-01-10. 139 rejected for people. **8 usable palm frames, which reduce to 3 distinct scenes.** |
| `نماء باسقات/درون`, 36 clips | the small clips are bare-land establishing shots and نماء site signage. One reservoir clip has a person beside the pump station. |

So the entire wave's photography rests on **three distinct real frames**, which
is exactly enough for the three photo concepts and no more. A shoot brief for
the client is the highest-value next step.

## Commands

```bash
python3 scripts/build-madani-ttf.py                       # (in ../scripts) fonts
python3 basseqat-meta-ads-v3/scripts/lib_fonts.py         # shaping selftest
node   basseqat-meta-ads-v3/scripts/lint_copy.mjs         # compliance
python3 basseqat-meta-ads-v3/scripts/build_v3.py --proof  # 24 PNGs + proofs
node   basseqat-meta-ads-v3/scripts/verify_finals.mjs     # AI sweep + Arabic read-back
GOOGLE_APPLICATION_CREDENTIALS=firebase/service-account.json \
  node firebase/upload-basseqat-statics-2026-08-images.mjs
GOOGLE_APPLICATION_CREDENTIALS=firebase/service-account.json \
  node firebase/seed-campaign-review.mjs \
    --config firebase/campaign-review-configs/basseqat-statics-2026-08.mjs [--dry-run]
```

Re-screening the Drive pool (already done, resumable, ~$0.55):

```bash
node firebase/screen-basseqat-photos.mjs --dry-run
```

**Vertex note:** `admireworks---internal-os` (project 712573851224) returns
`403 Lightning dunning decision is deny` on every model, which is also why the
2026-08-04 meeting extractions and the WhatsApp .xlsx analyses failed. Both AI
steps here run on the client's own healthy project, `basseqat-e8e95`.

## To release to the client

Set `visibility: 'client'` **and** `versionStatus: 'submitted'` together in
`firebase/campaign-review-configs/basseqat-statics-2026-08.mjs`, then re-run the
seeder. Changing only one leaves the page in a half-released state.
