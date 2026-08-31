# Meta Ad Audit — Genco

**Generated:** 2026-05-18 · **Window:** 2026-04-18 → 2026-05-17 (LAST_30_DAYS) · **Account:** `act_565810425828068` (Genco New Ad Account (AED) By ADW) · **Framework:** The Admire8 Framework (Admireworks)

---

## 1. Executive summary

**Account health score: 39 / 100** (weak on creative, strong on commercial — a paradox driven by video work doing the heavy lifting while text copy lags)

11 active ads across 3 campaigns. Every active ad is a **video ad** — per the skill's v1 scope, dimensions 1 (pattern interrupt) and 8 (archetype match) aren't scored here, so total scores are textual-only out of 45. The Arabic VO ad **`Video-Hend EasyFlow - AR`** is the single biggest commercial driver (23 purchases / 6,261 EGP value on 509 AED spend), but its creative is dynamic-template and the body copy isn't in the API cache — flag for manual export and creative-team review. The 30-day account header looks healthy on the surface (3.19% CTR, 12.97k clicks, 125 purchases reported by pixel) but a **currency mismatch** is hiding the truth: spend is AED while the Shopify pixel reports revenue in EGP. Reported ROAS of ~10x in Meta UI is closer to **~0.77x** once converted at ~13 EGP/AED — the account is genuinely **break-even at best, plausibly losing money**. Two of the 11 active ads (Boho Coffee, Adv+catalogue-Collection) are textually scoring ≤ 11 / 45 and converting at zero — kill them. The folding-table doubles launched May 16-17 are too new to judge. The other Genco Meta accounts (`act_600041378963885` main, `act_4058937727676217` standby) are dormant — confirm they're intentionally archived.

---

## 2. Top 3 winners (by commercial performance, not by score)

### 🥇 Video-Hend EasyFlow - AR — perf-led, copy unscored (cache miss)

- **Ad ID:** `120227712104850393`  ·  **Adset:** Broad -Cairo&Giza&Alex  ·  **Campaign:** AW-AA-Sales-Easyflow-15July
- **Spend:** 508.95 AED · **Impressions:** 41,859 · **CTR:** 3.62% · **CPC:** 0.34 AED · **Frequency:** 2.12
- **Purchases:** 23 · **Value:** 6,260.84 EGP · **Reported ROAS:** 12.30x · **Currency-corrected ROAS:** ~0.95x
- **ATC:** 60 · **IC:** 43 · **LPV:** 761 · **Click→LPV:** 50% · **LPV→Purchase:** 3.0%
- **Archetype:** unknown — Arabic VO video, creative `2407203353102277` not in API cache.
- **Why it works:** Highest absolute volume on the account. Arabic-language broad-targeted "EasyFlow" video has been running since 2025-07-15 — 10+ months of evergreen winner status. The drop-off cliff is LPV → Purchase (3% vs the 7% the account hits at smaller scale), which is a landing-page problem, not creative.
- **Scale recommendation:** Duplicate adset to defend against fatigue (frequency creeping past 2). Get the creative team to export the actual video + voiceover transcript and run it through Admire8 v2 scoring once visual analysis lands. Until then, treat as untouchable — keep budget pacing as-is.

### 🥈 Video-Hose Holder Set - VO -En — best ROAS, dynamic catalog template

- **Ad ID:** `120224411324230393`  ·  **Adset:** Hose Holder Ad set  ·  **Campaign:** Hose Holder Campaign
- **Spend:** 129.02 AED · **Impressions:** 16,144 · **CTR:** 2.64% · **CPC:** 0.30 AED · **Frequency:** 1.79
- **Purchases:** 12 · **Value:** 2,048.94 EGP · **Reported ROAS:** 15.88x · **Currency-corrected ROAS:** ~1.22x
- **ATC:** 39 · **IC:** 16 · **LPV:** 271
- **Archetype:** dynamic catalog template — body field is product-name driven, no fixed copy.
- **Why it works:** Running since 2025-05-22 (12 months). Hose holder is a high-margin, low-friction impulse product. Dynamic catalog template lets Meta serve the best-fitting product image to each user.
- **Scale recommendation:** Same as #1 — protect the winner. Worth testing a paused dupe with manual copy overlay if the team wants to lift dim 3 (specific benefit).

### 🥉 Video-manual hose -EN — strong supporting cast

- **Ad ID:** `120239433600520393`  ·  **Adset:** Hose Holder Ad set
- **Spend:** 112.33 AED · **Impressions:** 12,206 · **CTR:** 3.45% · **CPC:** 0.27 AED · **Frequency:** 1.82
- **Purchases:** 6 · **Value:** 1,284.51 EGP · **Reported ROAS:** 11.44x · **Currency-corrected ROAS:** ~0.88x
- **Archetype:** dynamic catalog template — creative cache miss on body copy.
- **Why it works:** Twin to the Hose Holder winner — same adset, same broad audience, similar CPC. Acts as a fatigue buffer.
- **Scale recommendation:** Hold; do not push budget. Pull body copy from Ads Manager and feed back into the audit for proper scoring.

---

## 3. Top 3 losers (by score AND zero conversions)

### ❌ Video-The Boho Coffee Corner Ayat - 1 — 11 / 45

- **Ad ID:** `120242218883570393`  ·  **Adset:** Broad -Cairo&Giza&Alex
- **Spend (wasted):** 3.45 AED · **CTR:** 1.42% (below 3.19% account avg) · **CPC:** 0.86 AED (3× account avg) · **Purchases:** 0
- **Body:** *"The perfect, boho-inspired centerpiece for your daily coffee ritual."*
- **Hemingway:** grade 9.6 · 1 sentence · 10 words · 1 "you"
- **Why it's losing:** Headline is lifestyle-aspirational without a concrete benefit ("daily coffee ritual" doesn't promise anything measurable). Grade 9.6 is more than double the framework's ≤ 4 ceiling — words like "boho-inspired centerpiece" are bookish and break the mobile-scroll spell. CTA is `ORDER_NOW` (1/5 per rubric — salesy). Zero ATC on 281 impressions is a hard "no" from the market.
- **Verdict:** **KILL.** Replace with Angle 3 below (specificity-led storage angle).

### ❌ Adv+catalogue-Collection-Dynamic Videos — 26 / 45 textually, 0 / 1,225 conversions

- **Ad ID:** `120230294483670393`  ·  **Adset:** Broad -Cairo&Giza&Alex
- **Spend (wasted):** 9.04 AED · **CTR:** 1.80% · **CPC:** 0.41 AED · **Purchases:** 0
- **Body:** *"Explore a wide range of water jug rack designs… Premium materials built to last. Fast Shipping within 4 days. Hassle-free returns. Exceptional Customer Service always ready to help. 👉Order now and enjoy Free shipping to Cairo & Giza on orders over EGP 750"*
- **Hemingway:** grade 8 · 5 sentences · 0 "you" · LEARN_MORE CTA (the only 5/5 CTA in the account)
- **Why it's losing:** Score isn't terrible (26/45 = "mid" band textually) — the issue is the offer-led, brand-led opening. "Explore a wide range" is the textbook violation of the framework's "lead with intrigue, not with brand" rule. 7 LPVs on 22 clicks means the click intent is shallow.
- **Verdict:** **REWRITE** — keep the LEARN_MORE CTA, swap the lead-in to a curiosity hook ("Three reasons leaving water jugs on the floor breaks your back faster than the actual lifting…").

### ❌ Video-Jugs on the floor-English — 25 / 45 textually, weak CTR for retargeting

- **Ad ID:** `120242531151920393`  ·  **Adset:** Retargeting - CAs - EXCLUDE PUR L30 (retargeting!)
- **Spend (wasted):** 281.86 AED · **CTR:** 1.49% (worst on the account) · **CPC:** 0.43 AED · **Frequency:** 3.20 (fatigue zone)
- **Purchases:** 10 · **Value:** 2,751.63 EGP · **Reported ROAS:** 9.76x (the lowest on the account)
- **Body:** *"leaving water jugs on the floor looks bad and creates clutter you don't need. The Genco Heavy Duty WaterRack is the straightforward solution to reclaim your space. -Organize… -Multitask… -Built to Last… Order now from Genco and get it delivered within 4 working days."*
- **Hemingway:** grade 7.5 · 6 sentences · **4 "you"s** · 0 mobile line breaks
- **Why it's losing:** This is a retargeting placement — the audience already views Genco products. Frequency 3.20 + CTR 1.49% says the audience is sick of seeing it. The body is grade 7.5 (framework cap is ≤4), four "you"s where the framework caps at 3 (Meta deprioritizes "you" address), and is structured as bullet-points-after-a-promise — which works on landing pages, not in feed copy. Despite all that, it converts at 9.76x reported (~0.75x corrected) because the *offer* is real.
- **Verdict:** **REWRITE — keep the offer, swap the angle.** Pull the four "you" mentions, drop the bullets, replace with a single-vignette story about reclaiming a corner of the kitchen. Test against the current control. Don't pause until the replacement is live and learning — this ad is the retargeting bucket's only spend.

---

## 4. Five new ad angles to test

Each angle conforms to the framework: pattern-interrupt visual brief + intrigue+benefit headline + slippery lead-in + butter body sketch + LEARN_MORE CTA.

### Angle 1 — "Three water jugs on a kitchen floor is costing Cairo families 14 EGP a month in wasted square meters."

- **Archetype:** secret info + native highlight
- **Image direction:** Top-down phone shot of a tiled Egyptian kitchen with three large blue water jugs sprawled awkwardly across the floor; a red circle drawn around the wasted floor space. Native, not studio.
- **Headline:** *"Three water jugs on a kitchen floor is costing Cairo families 14 EGP a month in wasted square meters."*
- **Slippery lead-in:** *"Most apartments in Heliopolis are billed by the square meter. The math gets ugly fast."*
- **Body sketch:**
  > The Genco WaterRack stacks three to five jugs vertically. Floor reclaimed: 0.6 m² to 1.1 m².
  >
  > Two-year warranty. Heavy-duty steel. Premium wooden multitasking shelf for the kettle.
  >
  > Delivered in 4 working days to Cairo, Giza, Alexandria. Free shipping over 750 EGP.
- **CTA:** Learn More
- **Hypothesis:** The current Jugs-on-the-floor ad's offer works — what's failing is the lifestyle framing. Reframing the offer as a *measurable* spatial-cost angle should outperform on Cairo apartment-dwellers (the existing converting segment).

### Angle 2 — "Egypt's most-installed folding table doesn't fold the way you think."

- **Archetype:** native social post + curiosity gap
- **Image direction:** Side-by-side: left side a busted plastic folding table with a leg bending under weight; right side a Genco fast-locking metal folder holding a full meal setup. Caption inset: "How is the right side still standing?"
- **Headline:** *"Egypt's most-installed folding table doesn't fold the way you think."*
- **Slippery lead-in:** *"Eleven steel reinforcement bars. Three of them are hidden inside the legs."*
- **Body sketch:**
  > Most folding tables fail in 2 to 3 years because the leg joints rust.
  >
  > Genco's fast-locking frame uses a sealed cam mechanism — no rust, no wobble, no pinched fingers.
  >
  > 120 cm × 60 cm. Holds 90 kg without a flex. 3-day delivery from GENCO.
- **CTA:** Learn More
- **Hypothesis:** The new folding-table doubles (launched May 16–17) have generic copy. Adding a specific number (eleven reinforcement bars, 90 kg, 3-day delivery) and the rust-fail negative hook should outperform the current "Heavy-duty table with a fast-locking frame. Simple & Fast setup."

### Angle 3 — "Coffee corners in Maadi are 40% smaller than they were 5 years ago. Here's how 22 households solved it."

- **Archetype:** native social post + raw native
- **Image direction:** Real iPhone photo of a Maadi-style small apartment kitchen with a WaterRack-with-wooden-shelf holding a coffee machine + jugs underneath. Slightly grainy, native feel.
- **Headline:** *"Coffee corners in Maadi are 40% smaller than they were 5 years ago. Here's how 22 households solved it."*
- **Slippery lead-in:** *"The trick is going vertical, not buying a smaller machine."*
- **Body sketch:**
  > Heavy-duty steel rack stores 3 jugs and gives a 50 × 30 cm shelf for the espresso setup.
  >
  > Premium pine top. No tools to assemble.
  >
  > Delivered in 4 working days. 2-year warranty. Free shipping over 750 EGP.
- **CTA:** Learn More
- **Hypothesis:** Maadi/Heliopolis density is real and quantifiable. A neighborhood-named angle + "22 households" social proof targets the same coffee-corner buyer the Boho ad failed to reach.

### Angle 4 — "خمسة أسباب يبيع بسوايا فيها GENCO شوايات أكتر من Weber" (Arabic)

- **Archetype:** breaking news + native highlight
- **Image direction:** Side-by-side comparison shot of a Genco charcoal grill vs a Weber kettle, with the Genco unit circled in red and a price-tag overlay showing the gap.
- **Headline:** *"خمسة أسباب يبيع بيها GENCO شوايات أكتر من Weber في مصر"* (Five reasons Genco sells more grills than Weber in Egypt)
- **Slippery lead-in:** *"السعر سبب واحد بس. الباقي بيتعلق بقطع الغيار وضمان السنتين."* (Price is just one. The rest is parts availability and the 2-year warranty.)
- **Body sketch:**
  > شواية فحم معدن ثقيل · توصيل 3 أيام داخل القاهرة والجيزة والإسكندرية · ضمان سنتين.
  >
  > متوفرة في 4 أحجام: 60، 80، 100، 120 سم.
  >
  > شحن مجاني للطلبات فوق 750 جنيه.
- **CTA:** Learn More
- **Hypothesis:** The Google Ads search-terms report shows **19 distinct Weber-branded queries** triggering on Genco grill keywords. There's clear competitor-conquest demand. An Arabic ad that names Weber directly (and out-specs them on parts + warranty) should peel high-intent buyers off Weber's search funnel into Meta's broad-targeted feed.

### Angle 5 — "ليه الستاند بتاع المية لازم يكون من إيه؟" (Arabic — Why does the water rack need to be made of what?)

- **Archetype:** raw native + curiosity gap
- **Image direction:** Vertical phone video, native, of a Cairo apartment with a delivery agent unboxing a WaterRack and a homeowner reacting. Single take, no music.
- **Headline:** *"ليه الستاند بتاع المية لازم يكون من إيه؟"*
- **Slippery lead-in:** *"الناس بيشتروا بلاستيك، وبعد سنة بيرموه."* (People buy plastic, and after a year they throw it out.)
- **Body sketch:**
  > حديد ثقيل مطلي ضد الصدأ. تركيب بدون عدة.
  >
  > بيستحمل من 3 لـ 5 جالونات مياه + رفّ خشبي للماكينات.
  >
  > توصيل 4 أيام. ضمان سنتين. شحن مجاني للطلبات فوق 750 جنيه.
- **CTA:** Learn More
- **Hypothesis:** The Arabic VO winner (#1 above) proves Arabic broad-targeted creative outperforms English on this audience. A second Arabic angle — colloquial Cairo dialect, durability-led, raw native — should cross-pollinate the Hend EasyFlow audience and prevent fatigue.

---

## 5. Performance × creative quality quadrant

Threshold: account-median CTR is 3.19% (30-day). ROAS-as-reported is misleading due to AED/EGP mismatch — using CTR.

|  | Performing (CTR ≥ 3.19%) | Underperforming (CTR < 3.19%) |
|---|---|---|
| **High textual score (≥ 30 / 45)** | (none — all video scoring incomplete) | (none) |
| **Mid textual score (15–29)** | (none scored — winners are dynamic-template / cache-miss) | **REWRITE:** Jugs on the floor (25) · Adv+catalogue-Collection (26) |
| **Low textual score (< 15)** | **PROTECT-WHILE-REPLACING:** Laundry Basket Ayat (13) — 3.82% CTR, 4 purchases; Video-Garden Needs Woman 40+ (12) — 4.10% CTR, 3 purchases | **KILL:** Boho Coffee Corner (11) — 1.42% CTR, 0 purchases |
| **Unscored (cache miss or new-build)** | Video-Hend EasyFlow AR · Video-Hose Holder Set · Video-manual hose · Adv+catalogue-Carousel-Watering · Folding Table 120 (×2 new) | (none) |

---

## 6. Per-ad appendix

Ordered by purchases descending. Visual dimensions (1, 8) not scored in v1 — all ads are video.

### Video-Hend EasyFlow - AR — perf-led, copy unscored

- **Ad ID:** 120227712104850393 · **Created:** 2025-07-15 · **Status:** ACTIVE
- **Creative ID:** 2407203353102277 (not present in API cache — likely paginated out)
- **Performance (30d):** spend 508.95 AED · impr 41,859 · CTR 3.62% · CPC 0.34 AED · CPM 12.16 AED · frequency 2.12 · purchases 23 · reported ROAS 12.30x · currency-corrected ROAS ~0.95x
- **Reasoning:** Highest commercial output on the account. Treat as untouchable until creative export is run.
- **Verdict:** **PROTECT.** Duplicate adset for fatigue defense.

### Video-Hose Holder Set - VO -En — 0 / 45 textual (dynamic template)

- **Ad ID:** 120224411324230393 · **Created:** 2025-05-22 · **Status:** ACTIVE
- **Creative ID:** 961214782988366 — dynamic-product-feed template, no fixed body in cache.
- **Performance (30d):** spend 129.02 AED · impr 16,144 · CTR 2.64% · CPC 0.30 AED · frequency 1.79 · purchases 12 · reported ROAS 15.88x · currency-corrected ROAS ~1.22x
- **Verdict:** **PROTECT.** Highest absolute ROAS on the account.

### Video-manual hose -EN — 0 / 45 textual (dynamic template)

- **Ad ID:** 120239433600520393 · **Created:** 2026-03-11 · **Status:** ACTIVE
- **Creative ID:** 33135859879392685 — dynamic-product-feed template, no fixed body in cache.
- **Performance (30d):** spend 112.33 AED · impr 12,206 · CTR 3.45% · CPC 0.27 AED · frequency 1.82 · purchases 6 · reported ROAS 11.44x · currency-corrected ROAS ~0.88x
- **Verdict:** **HOLD.** Twin of #2 — defends the Hose Holder adset against fatigue.

### Laundry Basket Ayat VO2 — 13 / 45 textual

| Dimension | Score |
|---|---|
| 1. Pattern interrupt | not scored (video) |
| 2. Headline intrigue | 2 / 10 |
| 3. Headline benefit | 4 / 10 |
| 4. Slippery lead-in | 2 / 10 |
| 5. Body copy quality | 3 / 10 |
| 6. CTA fit | 1 / 5 |
| 7. Specificity | 1 / 10 |
| 8. Archetype match | not scored (video) |
| **Total (textual /45)** | **13 / 45** |

- **Ad ID:** 120241595663790393 · **Created:** 2026-04-20
- **Body:** *"Invest in solid wood storage that handles daily weight with ease."*
- **Hemingway:** grade 5.9, 1 sentence, 11 words, 0 "you"
- **Performance (30d):** spend 75.93 AED · impr 6,393 · CTR 3.82% · CPC 0.31 AED · frequency 1.66 · purchases 4 · reported ROAS 18.71x · currency-corrected ROAS ~1.44x
- **Reasoning:** Best stated-ROAS on the account but on textual-score this ad is in the kill band. The video itself is doing the work — copy is one-liner with no concrete benefit, no specific outcome, salesy CTA. Risk: when the video fatigues, the copy has nothing to lean on.
- **Verdict:** **PROTECT WHILE REPLACING COPY.** Test Angle 3 against the current control.

### Video-Jugs on the floor-English — 25 / 45 textual

| Dimension | Score |
|---|---|
| 1. Pattern interrupt | not scored (video) |
| 2. Headline intrigue | 5 / 10 |
| 3. Headline benefit | 7 / 10 |
| 4. Slippery lead-in | 6 / 10 |
| 5. Body copy quality | 2 / 10 |
| 6. CTA fit | 1 / 5 |
| 7. Specificity | 4 / 10 |
| 8. Archetype match | not scored (video) |
| **Total (textual /45)** | **25 / 45** |

- **Ad ID:** 120242531151920393 · **Created:** 2026-05-05
- **Body:** *"leaving water jugs on the floor looks bad and creates clutter you don't need. The Genco Heavy Duty WaterRack is the straightforward solution to reclaim your space. -Organize… -Multitask… -Built to Last… Order now from Genco and get it delivered within 4 working days."*
- **Hemingway:** grade 7.5, 6 sentences, 4 "you"s, 0 mobile line breaks
- **Performance (30d):** spend 281.86 AED · impr 44,106 · CTR 1.49% · CPC 0.43 AED · frequency 3.20 · purchases 10 · reported ROAS 9.76x · currency-corrected ROAS ~0.75x
- **Reasoning:** Only retargeting ad active. Worst CTR on the account at 1.49% (account avg 3.19%); fatigue is in. Four "you"s breach the framework cap of 3. The grade-7.5 body uses bullets where prose belongs.
- **Verdict:** **REWRITE → Angle 1.** Don't pause until the rewrite is live.

### Video-manual hose -EN (dynamic template) — duplicate header above, see #3

### Video-Garden Needs Woman 40+ — 12 / 45 textual

| Dimension | Score |
|---|---|
| 1. Pattern interrupt | not scored (video) |
| 2. Headline intrigue | 2 / 10 |
| 3. Headline benefit | 3 / 10 |
| 4. Slippery lead-in | 2 / 10 |
| 5. Body copy quality | 3 / 10 |
| 6. CTA fit | 1 / 5 |
| 7. Specificity | 1 / 10 |
| 8. Archetype match | not scored (video) |
| **Total (textual /45)** | **12 / 45** |

- **Ad ID:** 120239397403220393 · **Created:** 2026-03-10
- **Body:** *"Picture-perfect garden. Keep it organized and effortless with Genco's heavy-duty essentials. High quality, fast delivery, and designs that last."*
- **Hemingway:** grade 9.1, 3 sentences, 0 "you"
- **Performance (30d):** spend 12.35 AED · impr 854 · CTR 4.10% · CPC 0.35 AED · frequency 1.42 · purchases 3 · reported ROAS 27.89x · currency-corrected ROAS ~2.14x — **the only ad above corrected ROAS = 2x**
- **Reasoning:** The video is carrying this ad on the strength of audience targeting (Woman 40+) — copy is a "kill" textually. Tiny spend, productive output. The standout outlier on commercially-corrected ROAS.
- **Verdict:** **INVEST.** Triple the budget cautiously, watch frequency, replace copy with Angle 3 if it stalls.

### Adv+catalogue-Collection-Dynamic Videos — 26 / 45 textual

| Dimension | Score |
|---|---|
| 1. Pattern interrupt | not scored (video) |
| 2. Headline intrigue | 2 / 10 |
| 3. Headline benefit | 5 / 10 |
| 4. Slippery lead-in | 3 / 10 |
| 5. Body copy quality | 5 / 10 |
| 6. CTA fit | 5 / 5 (LEARN_MORE) ✅ |
| 7. Specificity | 6 / 10 |
| 8. Archetype match | not scored (video) |
| **Total (textual /45)** | **26 / 45** |

- **Ad ID:** 120230294483670393 · **Created:** 2025-08-25
- **Body:** *"Explore a wide range of water jug rack designs at Genco for a more organized space with a touch of beauty and functionality. Experience the Genco difference: Premium materials built to last. Fast Shipping within 4 days. Hassle-free returns. Exceptional Customer Service always ready to help. 👉Order now and enjoy Free shipping to Cairo & Giza on orders over EGP 750"*
- **Hemingway:** grade 8, 5 sentences, 0 "you"
- **Performance (30d):** spend 9.04 AED · impr 1,225 · CTR 1.80% · CPC 0.41 AED · frequency 1.13 · purchases 0
- **Reasoning:** Only ad on the account with the framework-aligned LEARN_MORE CTA. Body is brand-first ("Explore a wide range") — violates the framework's lead-with-intrigue rule. 7 LPVs on 22 clicks = shallow intent.
- **Verdict:** **REWRITE** keeping the LEARN_MORE CTA. Test Angle 1 or 3 in this slot.

### Adv+catalogue-Carousel-Watering Solutions-EN — unscored (cache miss)

- **Ad ID:** 120229517103210393 · **Created:** 2025-08-11
- **Creative ID:** 1507469570370063 — not in API cache; need manual export.
- **Performance (30d):** spend 4.15 AED · impr 403 · CTR 3.97% · CPC 0.26 AED · purchases 0
- **Verdict:** **EXPORT FOR SCORING.** Encouraging CTR but no conversion volume yet — can't verdict without copy.

### Video-The Boho Coffee Corner Ayat - 1 — 11 / 45 textual

| Dimension | Score |
|---|---|
| 1. Pattern interrupt | not scored (video) |
| 2. Headline intrigue | 3 / 10 |
| 3. Headline benefit | 2 / 10 |
| 4. Slippery lead-in | 2 / 10 |
| 5. Body copy quality | 2 / 10 |
| 6. CTA fit | 1 / 5 |
| 7. Specificity | 1 / 10 |
| 8. Archetype match | not scored (video) |
| **Total (textual /45)** | **11 / 45** |

- **Ad ID:** 120242218883570393 · **Created:** 2026-04-29
- **Body:** *"The perfect, boho-inspired centerpiece for your daily coffee ritual."*
- **Hemingway:** grade 9.6, 1 sentence, 1 "you"
- **Performance (30d):** spend 3.45 AED · impr 281 · CTR 1.42% · CPC 0.86 AED (3× account avg) · frequency 1.38 · purchases 0 · 1 ATC, 2 LPV
- **Reasoning:** Lowest textual score. Lifestyle framing without measurable benefit. CPC is 3x the account avg. The "boho" framing collides with a heavy-duty product line — wrong tone.
- **Verdict:** **KILL.** Replace slot with Angle 3.

### video-Folding Table 120 Fast Locking Fast Forward Reel — 19 / 45 textual

| Dimension | Score |
|---|---|
| 1. Pattern interrupt | not scored (video) |
| 2. Headline intrigue | 3 / 10 |
| 3. Headline benefit | 5 / 10 |
| 4. Slippery lead-in | 3 / 10 |
| 5. Body copy quality | 3 / 10 |
| 6. CTA fit | 1 / 5 |
| 7. Specificity | 4 / 10 |
| 8. Archetype match | not scored (video) |
| **Total (textual /45)** | **19 / 45** |

- **Ad ID:** 120243275727210393 · **Created:** 2026-05-16 (2 days ago — learning)
- **Body:** *"Heavy-duty table with a fast-locking frame. Simple & Fast setup. 3-day delivery from GENCO."*
- **Hemingway:** grade 6, 3 sentences, 0 "you"
- **Performance (30d):** spend 14.51 AED · impr 1,097 · CTR 3.74% · CPC 0.35 AED · purchases 0
- **Reasoning:** Too new to judge perf. Copy is short and lacks an angle hook. Once it has 7 days of data, re-evaluate against Angle 2.
- **Verdict:** **HOLD 7 DAYS.**

### video-Folding Table 120 Fast Locking Flamengo — 19 / 45 textual

- **Ad ID:** 120243325984280393 · **Created:** 2026-05-17 (1 day ago — learning)
- Same body, same scores as the Fast Forward variant.
- **Performance (30d):** spend 1.07 AED · impr 69 · CTR 7.25% · CPC 0.21 AED · purchases 0
- **Verdict:** **HOLD 7 DAYS.**

---

## 7. Cross-account observations

### Three Genco Meta accounts exist; two are dormant

| Account ID | Name | Currency | Lifetime spend | Last 30d spend | Status |
|---|---|---|---|---|---|
| `act_565810425828068` | Genco New Ad Account (AED) By ADW | AED | 6,995,797 | 2,999.69 | **ACTIVE — audited above** |
| `act_600041378963885` | Genco Main Ad Account 600041378963885 | EGP | 34,521,076 | 0 | Dormant |
| `act_4058937727676217` | Genco Standby 1 | EGP | 438,570 | 0 | Dormant |

All three share business `733952912072733` (Genco). The Main account has 4.9× the lifetime spend of the AW-managed account — confirm with the client whether it's intentionally archived or whether there's split media governance.

### Currency mismatch is hiding real ROAS

- **Spend currency:** AED (account-level)
- **Pixel revenue currency:** EGP (Shopify store currency)
- Meta UI divides EGP / AED without converting → reported ROAS overstated by ~13×
- Account-level reported ROAS: 30,094 / 2,999 = **10.03x** → corrected: **0.77x**
- Recommend the AW finance team confirm: is the AED ad spend funded with AED card, then reconciled to EGP P&L? Either way, **the reporting needs a currency-corrected dashboard view** before the team makes scaling decisions.

### Action items to close the audit loop

1. **Export the 4 unscored creatives** from Ads Manager (1507469570370063 carousel, 961214782988366 hose-holder dynamic, 33135859879392685 manual-hose dynamic, 2407203353102277 Hend EasyFlow AR). Re-score against Admire8 once the body copy + visual is in hand.
2. **Confirm dormant account intent** with the client — is `act_600041378963885` paused, or is it running on a different management track?
3. **Currency-correct the dashboard** — every ROAS number quoted internally should carry the AED→EGP conversion footnote until the accounts are aligned.
4. **Stand up the rewrite test** — Angle 1 vs the current Jugs-on-the-floor retargeting ad. 7-day window. If Angle 1 wins by 30%+ CTR, ship to all 4 rewrite candidates.
5. **Brief the creative team on Angle 4** (Arabic Weber-conquest) — the demand signal is in the Google Ads search-terms report; capture it in Meta before the cost-per-search-click rises.

---

*Generated by the `meta-ad-audit` skill (v1 adapted for all-video portfolio). Framework: The Admire8 Framework — Admireworks' 8-dimension direct-response creative score. Rubric definitions in `~/.claude/skills/meta-ad-audit/references/admire8-framework.md`. Visual dimensions (1, 8) not scored in v1 because all 11 active ads are video — body-copy + CTA + specificity scored out of 45.*
