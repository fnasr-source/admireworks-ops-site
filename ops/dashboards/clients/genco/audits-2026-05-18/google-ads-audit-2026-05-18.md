# Google Ads Audit — Genco

**Generated:** 2026-05-18 · **Window:** 2026-04-18 → 2026-05-17 (LAST_30_DAYS) · **Account:** `903-356-9098` (Genco Google Ads account) under MCC `885-975-9478` · **Currency:** EGP · **Status:** ENABLED

> Sequel to [`google-ads-phase1-fixes-2026-05-11.md`](../admin/google-ads-phase1-fixes-2026-05-11.md) and [`google-ads-phase2-fixes-2026-05-11.md`](../admin/google-ads-phase2-fixes-2026-05-11.md). 7 calendar days after Phase 2 went live — first audit-and-correct pass on the rebuilt account.

---

## 1. Account health snapshot

### Headline (30-day envelope)

| Metric | Value | Read |
|---|---|---|
| Total spend | **EGP 1,386.40** | 5.8% of the EGP 24,000/month combined cap. Account is severely under-pacing — but only had **7 days** of meaningful serving (Phase 1+2 went live 2026-05-11; Search_AR launched 2026-05-15). |
| Impressions | 2,221 | |
| Clicks | 127 | |
| Account CTR | **5.72%** | Strong for Search — competitor accounts on the same Egyptian product categories typically run 2-4%. |
| Average CPC | EGP 10.92 | High for an EGP market — the rank_lost_IS bidding-up dynamic (see §1.3) explains it. |
| Conversions (all) | **0** | The big red flag — see §4 conversion plumbing. |
| Conversion value | EGP 0 | |
| ROAS | 0x | |
| Time zone | `America/Blanc-Sablon` | **Misconfigured** — should be `Africa/Cairo`. Causes Egyptian timezone reports to be off by ~5–7 hours and breaks day-parting analysis. Flag for client to fix in Account Settings (irreversible after first impression in the API, but worth raising — Genco may need a fresh account or an internal workaround). |

### 7-day live-serving cut (2026-05-11 → 2026-05-17)

Effectively identical to the 30-day cut — all spend happened in this window.

### Auction insights — ad rank loss is still the bottleneck

| Campaign | Search IS | Top IS | Abs-Top IS | IS lost to **budget** | IS lost to **rank** |
|---|---|---|---|---|---|
| AW-Genco_Search_EN_Main | **20.2%** | 15.5% | 10.0% | 0.9% | **78.9%** |
| AW-Genco_Search_AR | **31.3%** | 25.2% | 10.0% | 18.6% | **50.1%** |

The pre-Phase-1 baseline was `rank_lost_IS = 90%`. Today's 79% on EN_Main and 50% on AR is **measurable progress** but still terrible — we're losing 4 of every 5 EN auctions on ad rank, and 1 of every 2 AR auctions. The AR campaign is **also** budget-constrained (18.6% IS_lost_budget on EGP 200/day) — this is now a real-money decision, not a setup-quality issue.

> **Implication:** the campaigns can serve more if we (a) lift Quality Score on the keywords with QS ≤ 4 and (b) raise the AR daily budget once conversion tracking is verified.

---

## 2. Campaign-level diagnostic

Three campaigns live (not the 2 the Phase 2 doc documented — the Arabic mirror was launched 2026-05-15, three days *before* this audit):

| Campaign ID | Name | Type | Status | Budget | Bidding | 30d spend | 30d clicks | 30d CTR | 30d conv |
|---|---|---|---|---|---|---|---|---|---|
| 23821447827 | AW-Genco_Search_EN_Main | SEARCH | ENABLED — LEARNING | EGP 500/day | **TARGET_SPEND** | 882.65 | 61 | 10.36% | 0 |
| 23851743520 | AW-Genco_Search_AR | SEARCH | ENABLED — LEARNING | EGP 200/day | **TARGET_SPEND** | 455.01 | 51 | 7.17% | 0 |
| 23831708844 | AW-Genco_PMax_Catalog | PERFORMANCE_MAX | **PAUSED** | EGP 300/day | MAXIMIZE_CONVERSIONS | 48.74 | 15 | 1.63% | 0 |

### 🟡 Bidding strategy regression vs Phase 2

Phase 2 (5 days ago) set Search at `MAXIMIZE_CONVERSIONS` (implicitly — though the doc didn't quote this explicitly, it followed the "smart bidding once we have signal" rule). The current state is **`TARGET_SPEND` (Maximize Clicks)** on both Search campaigns — this maximizes click volume without regard to conversion. Until conversion tracking is firing reliably (see §4), Maximize Clicks is *defensible* — but it has to be flipped to `MAXIMIZE_CONVERSION_VALUE` + tROAS the moment ≥30 conversions accumulate. **Set a calendar reminder.**

### 🔴 PMax is paused — major change from Phase 2

Phase 2 set PMax to ENABLED/ELIGIBLE/SERVING. As of today PMax is **PAUSED**. No documented reason in `clients/Genco/admin/`. Most likely cause: someone manually paused it after observing zero conversions in week 1. Recommendation: **un-pause PMax** once the conversion tracking is verified (§4) — PMax needs the conversion signal to learn and pausing it for "no conversions" is the same as the Search-only learning problem at 100× the cost (it'll never serve again until learning resumes).

### Search_AR campaign — new, undocumented launch

Started 2026-05-15 (3 days ago). Already serving 7.17% CTR, 51 clicks, 455 EGP — strongest engagement-per-EGP on the account. Not mentioned in Phase 1/2 docs. **Update the admin/ docs to backfill what was built here** so the team has a single source of truth.

---

## 3. Ad-group diagnostic

### EN_Main — only 5 of 13 ad groups are ENABLED

This is a regression from Phase 2 which set all 13 ENABLED. **Eight ad groups are now PAUSED.** No documented reason. Likely cause: pause-by-low-impressions cleanup before they had a chance to enter learning.

| Ad group | ID | Status | 30d impr | 30d clicks | 30d CTR | 30d spend | Ad strength | RSA status |
|---|---|---|---|---|---|---|---|---|
| Grills | 193227070701 | ENABLED | 327 | 32 | 9.79% | 462.50 | GOOD | 808397893434 ENABLED, 808040441446 PAUSED |
| Folding Tables | 194993742854 | ENABLED | 92 | 8 | 8.70% | 117.15 | **POOR** | 808007254215 ENABLED |
| water racks | 197826740362 | ENABLED | 92 | 8 | 8.70% | 117.14 | GOOD | 808511927924 ENABLED, 808038933769 PAUSED |
| Outdoor Storage | 196309628573 | ENABLED | 43 | 10 | **23.26%** | 141.52 | GOOD | 808514850638 ENABLED |
| Hose Holders | 199969212121 | ENABLED | **1** | 0 | 0% | 0 | **EXCELLENT** | 808432368898 ENABLED |
| Plant Stands | 194174509857 | **PAUSED** | 0 | 0 | — | 0 | PENDING | 808401122049 ENABLED-but-paused-group |
| Fire Pits | 194175009817 | **PAUSED** | 0 | 0 | — | 0 | PENDING | 808401183792 ENABLED-but-paused-group |
| Garden Tools | 196309635733 | **PAUSED** | 0 | 0 | — | 0 | PENDING | 808514977883 ENABLED-but-paused-group |
| Indoor Storage | 196455537117 | **PAUSED** | 0 | 0 | — | 0 | PENDING | 808514776775 ENABLED-but-paused-group |
| Hose Hangers | 196712440935 | **PAUSED** | 0 | 0 | — | 0 | GOOD | 808514632778 ENABLED-but-paused-group |
| Water Sprayers | 196712445335 | **PAUSED** | 0 | 0 | — | 0 | PENDING | 808432715488 ENABLED-but-paused-group |
| Hose Reels | 199969216041 | **PAUSED** | 11 | 1 | 9.09% | 14.48 | GOOD | 808514853599 ENABLED-but-paused-group |
| Garden Hoses | 200225602470 | **PAUSED** | 23 | 2 | 8.70% | 29.86 | GOOD | 808514857586 ENABLED-but-paused-group |

**Two findings that demand action:**

1. **Outdoor Storage is the breakout** — 23.26% CTR on 43 impressions, all-time highest CTR ad group on the account. 5 of the 10 clicks came from "outdoor storage egypt" (search-terms report, 40% CTR on that specific query). Move budget toward this ad group: raise its bid ceiling, expand its keyword list with the high-intent search queries seen in §6 (e.g., "outdoor storage cabinet waterproof" at 20% CTR, "plastic outdoor storage cabinet waterproof" at 100% CTR).

2. **Hose Holders is rated EXCELLENT but got 1 impression** — the strongest RSA in the account is starving for impressions because the keyword set is exact-match only and the auction is owned by Weber-equivalent competitors. Add 3-5 broader phrase-match keywords ("garden hose holder wall mount", "best hose holder for villa", "modern hose holder") to give the EXCELLENT ad a chance to serve.

### Search_AR — 2 of 3 ad groups serving

| Ad group | ID | Status | 30d impr | 30d clicks | 30d CTR | 30d spend | Ad strength |
|---|---|---|---|---|---|---|---|
| grills | 197405158958 | ENABLED | 677 | 47 | 6.94% | 419.42 | **AVERAGE** |
| folding tables | 196422238693 | ENABLED | 27 | 4 | 14.81% | 35.59 | **AVERAGE** |
| water rack | 202197285331 | ENABLED | 7 | 0 | 0% | 0 | GOOD |

The Arabic Grills ad group is generating **92% of AR campaign spend** — there's strong Arabic search demand for charcoal grills (شواية فحم / شوايات فحم / شوايات خارجية). Both Arabic RSAs (AVERAGE strength) need 2-3 more headlines + 1 more description to lift to GOOD/EXCELLENT — Google's strength algorithm rewards 12+ headlines.

---

## 4. Conversion plumbing — **broken in production**

**Zero conversions fired across any conversion action in 30 days.** Confirmed via `SELECT segments.conversion_action_name, metrics.all_conversions FROM customer` — empty result set.

### Conversion action inventory (active)

| ID | Name | Type | Category | Status | Primary | Incl. metric |
|---|---|---|---|---|---|---|
| 7598661558 | Google Shopping App Purchase | WEBPAGE | **PURCHASE** | ENABLED | ✅ | ✅ |
| 7598661561 | Google Shopping App Begin Checkout | WEBPAGE | BEGIN_CHECKOUT | ENABLED | ❌ | ❌ |
| 7598661564 | Google Shopping App Add To Cart | WEBPAGE | ADD_TO_CART | ENABLED | ❌ | ❌ |
| 7598661567 | Google Shopping App Page View | WEBPAGE | PAGE_VIEW | ENABLED | ❌ | ❌ |
| 7598661570 | Google Shopping App View Item | WEBPAGE | PAGE_VIEW | ENABLED | ❌ | ❌ |
| 7598698951 | Google Shopping App Search | WEBPAGE | PAGE_VIEW | ENABLED | ❌ | ❌ |
| 7598698954 | Google Shopping App Add Payment Info | WEBPAGE | DEFAULT | ENABLED | ❌ | ❌ |
| 7600831163 | YouTube channel subscriptions | UNKNOWN | ENGAGEMENT | ENABLED | ✅ | ✅ |
| 7600831343 | YouTube follow-on views | UNKNOWN | UNKNOWN | ENABLED | ✅ | ✅ |
| 7600841264 | Genco Metalworks (web) purchase | GA4_PURCHASE | PURCHASE | ENABLED | ❌ | ❌ |
| 7600841267 | Genco Metalworks (web) ads_conversion_Checkout_1 | GA4_CUSTOM | BEGIN_CHECKOUT | **HIDDEN** | ❌ | ❌ |
| 7600841270 | Genco Metalworks (web) ads_conversion_Shopping_Cart_1 | GA4_CUSTOM | PURCHASE | **HIDDEN** | ❌ | ❌ |

### Diagnosis

- Phase 1+2 cleanup is **intact** — the 7 duplicate Shopify Channel actions are still REMOVED, the negative-keyword set (27 entries) is still in place, customer-level conversion-goal biddability is locked to PURCHASE-only. The structural fix held.
- The primary PURCHASE pixel (`7598661558`) **has not fired even once** in 30 days. Cross-reference with Meta: same store fired **125 purchases** on Meta over the same window. So the Shopify store *is* converting — Google Ads just isn't seeing the events.
- Most likely cause (per [Phase 2 §3](../admin/google-ads-phase2-fixes-2026-05-11.md)): **the dual GA4 properties** (`G-ZS8DGWQT5W` and `G-JHR423K54K`) are still firing on the site, but neither the Shopify Channel pixel nor the GA4-import is wired to a *purchase* event that Google Ads can attribute. The Shopify Channel pixel fires on page-view events, not purchase events — the actual conversion never makes it back to Google Ads.
- Second possible cause: 127 clicks in 30 days at 7.17%–10.36% CTR is real traffic, but maybe none of those visitors converted within the 30-day attribution window. Less likely given Meta-side conversion rates on equivalent traffic.

### Open Phase 2 follow-up #3 — `7600841270` still HIDDEN

Confirmed. This is correct as a *current* state because the GA4 event is mis-categorised as PURCHASE. Until the GA4 mapping is fixed, leaving it hidden is the right call.

### Recommended fix — verify, don't redeploy

1. **Run a test transaction** — buy a low-cost item on gencostores.com from a Google-Ads-clicked session. Confirm within 24h that `7598661558` records the conversion in `Tools → Conversions`.
2. **If the test transaction does NOT fire** the Shopify Channel pixel: open Shopify Admin → "Google & YouTube" channel app → reconnect the conversion tracking. The Channel app's pixel needs to be re-bound to a *checkout completed* event, not page-view.
3. **If the test fires but the GA4 conversion** (`7600841264`) doesn't: the GA4 → Google Ads import lag is normally 24–48h; wait two days, recheck.
4. **Don't enable smart bidding** until at least 30 conversions are visible on `7598661558`. The current TARGET_SPEND strategy is the right interim.

---

## 5. Keyword-level diagnostic

### Phase 1 negative-keyword set — **intact and working**

All 27 campaign-level negatives applied in Phase 1 are still ENABLED (`uline`, `walmart`, `amazon`, `lowes`, `costco`, `ikea`, `wholesale`, `bulk`, `manufacturer`, `industrial`, `commercial`, `salary`, `career`, `download`, `pdf`, `dwg`, `cad`, `secondhand`, `diy`, `home depot`, `jobs`, `job`, `free template`, `used`, `repair`, `fix`, `how to`). ✅

### 🔴 BROAD-match regression in `water racks` ad group

Phase 1 explicit rule: *"EXACT + PHRASE only (no BROAD) — protects spend until smart bidding is on."*

Current state of ad group `water racks` (id 197826740362):

| Keyword | Match type | Status |
|---|---|---|
| steel shelving unit | **BROAD** | ENABLED |
| metal shelving unit | **BROAD** | ENABLED |
| metal storage rack | **BROAD** | ENABLED |
| heavy duty steel shelving | **BROAD** | ENABLED |
| 5 tier metal shelf | **BROAD** | ENABLED |
| water bottle rack | **BROAD** | ENABLED |
| heavy duty metal shelving unit | **BROAD** | ENABLED |
| stainless steel racking | **BROAD** | ENABLED |
| metal shelf rack | **BROAD** | ENABLED |
| metal shelving with wheels | **BROAD** | ENABLED |
| water dispenser rack | **BROAD** | ENABLED |
| **uline metal shelving** | **BROAD** | ENABLED |
| water gallon rack | **BROAD** | ENABLED |
| water storage rack | **BROAD** | ENABLED |
| metal water rack | **BROAD** | ENABLED |
| steel water rack | **BROAD** | ENABLED |

**16 BROAD keywords in one ad group**, including `uline metal shelving` (a US competitor — and `uline` is a campaign-level negative, but the in-ad-group keyword overrides). This is what's feeding the wasteful "uline metal shelving", "hanimex egypt", "homzmart", "home center egypt", and "steel furniture egypt" search-terms (§6) into the ad group.

**Action:** Convert all 16 BROAD keywords to PHRASE match. Don't delete — Phase 1 took care to keep the keyword *set* — just lower the match type. Wait for smart bidding before re-introducing BROAD.

### Quality Score map (where QS is reported)

| Ad group | Keyword | QS | Comment |
|---|---|---|---|
| Grills | charcoal grill | 5 | OK |
| Grills | **portable grill** | **2** | Critical — rebuild landing copy or pause keyword |
| Grills | outdoor grill | 5 | OK |
| Grills | bbq grill egypt | 5 | OK |
| Grills | grill egypt | 5 | OK |
| Folding Tables | folding table | 5 | OK |
| Folding Tables | foldable table | 5 | OK |
| Folding Tables | heavy duty folding table | **7** | Top scorer EN |
| Folding Tables | folding table egypt | 6 | OK |
| Outdoor Storage | outdoor storage | **7** | Top scorer EN |
| Outdoor Storage | garden storage | **4** | Drop — Google flags it |
| Outdoor Storage | outdoor storage egypt | **7** | Top scorer EN |
| Garden Hoses | garden hose | **3** | Critical |
| Garden Hoses | garden hose egypt | **3** | Critical |
| folding tables (AR) | كراسي قابلة للطي | **4** | Off-product (chairs) — remove |
| grills (AR) | شواية فحم | **4** | Tighten landing-page match |
| grills (AR) | شوايات فحم | 5 | OK |
| grills (AR) | شوايات خارجية (EXACT) | **7** | Top scorer AR |
| grills (AR) | شوايات خارجية (PHRASE) | **7** | Top scorer AR |

QS ≤ 3 keywords on enabled ad groups need landing-page copy alignment with the keyword theme. The `garden hose` QS = 3 is particularly bad given Genco's flagship 50m heavy-duty hose is a core SKU.

### 🔴 Off-product keywords in `folding tables` AR ad group

The AR folding-tables ad group has Genco's metal folding *tables* as its product target, but the keyword list includes:

- `كراسي قابلة للطي` (folding chairs) — Genco does not sell chairs
- `كراسي رحلات` (camping chairs) — same
- `طقم طاولة وكراسي` (table + chairs set) — half off-product

**Action:** Pause or remove these three keywords. The search-terms report shows `كراسي قابلة للطي` getting 6 impressions, 1 click, 8.73 EGP wasted in 30 days. Small now, will scale with budget.

---

## 6. Search-terms report — negative-keyword candidates

Top wasters (search queries that don't fit Genco's product line):

### Tier 1 — competitor brand-conquest queries (high volume, mismatched intent)

Add as **campaign-level negative PHRASE-match** on EN_Main (and on PMax if reactivated):

| Negative to add | Why | 30d cost |
|---|---|---|
| `weber` | 19 distinct Weber-branded queries triggering grill keywords (weber egypt, weber grill, weber master touch, weber 47cm, weber compact kettle, weber smokey joe, weber go anywhere, weber original kettle, etc.) — competitor brand-conquest works in *targeted* campaigns, not in a generic-keyword catch-all. | 26.83 |
| `homzmart` | Egyptian competitor retailer | 0 (yet) |
| `hanimex` | Steel furniture distributor | 14.98 |
| `home center` | Competitor retailer | 0 (yet) |
| `decathlon` | Generic camping store | 0 (yet) |
| `mintra` | Local plastic-furniture brand | 0 (yet) |
| `jamie oliver` | Brand competitor on grills | 0 (yet) |
| `cobb` | Grill brand | 0 (yet) |
| `ferraboli` | Grill brand | 0 (yet) |
| `proq` | Grill brand | 0 (yet) |
| `kamado` | Ceramic grill style | 0 (yet) |
| `smokey mountain` | Specific Weber product line | 0 (yet) |
| `vota` | Egyptian grill brand | 15.00 |
| `sparo` | Egyptian grill brand | 0 |
| `fast grill` | Brand name | 15.00 |
| `fabrilla` | Brand name | 0 |
| `farhan steel` | Local Egyptian competitor | 0 |
| `furniture website` | Off-intent generic | 14.86 |

Total 30d wasted on competitor + off-intent queries: **~87 EGP** (10% of EN_Main spend). Will scale linearly with budget — fix now.

### Tier 2 — off-product queries (PHRASE match where the query is the negative)

| Negative | Why |
|---|---|
| `chairs` (PHRASE) | Folding chairs / camping chairs / table-and-chairs sets — Genco sells tables, not chairs |
| `كراسي` (PHRASE — Arabic for chairs) | Same |
| `بلاستيك` (PHRASE — Arabic for plastic) | Genco sells metal, plastic queries are off-product |
| `shelves` (PHRASE) | Bookshelves / ladder shelves are off-product |
| `bookshelf` is already an EXACT keyword in Indoor Storage — keep it there but add `bookshelf egypt` PHRASE as positive |
| `gas grill` (PHRASE) | Genco sells charcoal/wood — gas grill seekers won't convert |
| `electric grill` (PHRASE) | Same |

### Tier 3 — high-intent queries to **add as positive keywords**

These are currently getting triggered via broad/phrase match but should be exact-match keywords in their relevant ad group:

| Query to add as EXACT | Target ad group | 30d CTR | Notes |
|---|---|---|---|
| `outdoor storage cabinet waterproof` | Outdoor Storage | 20% | High intent |
| `plastic outdoor storage cabinet waterproof` | Outdoor Storage | 100% (1/1) | Plastic in query — but the searcher converted to a click; A/B test |
| `outdoor storage cabinet` | Outdoor Storage | 0% but recurring | |
| `outdoor storage box` | Outdoor Storage | 0% but recurring | |
| `شواية فحم منزلية` | grills (AR) | 11% | Add as Arabic EXACT |
| `شواية فحم كبيرة` | grills (AR) | 11% | |
| `شواية فحم محمولة` | grills (AR) | 16% | |
| `شواية فحم استانلس` | grills (AR) | 11% | |
| `أسعار شوايات الفحم` | grills (AR) | 22% | Price-intent — highest-converting query type |
| `charcoal grill egypt` | Grills (EN) | 12.5% | Add as EXACT, currently PHRASE-matched via `grill egypt` |
| `heavy duty shelf unit` | Indoor Storage | 50% (1/2) | Re-enable Indoor Storage ad group |

---

## 7. PMax diagnostic (paused — context only)

Campaign 23831708844 (`AW-Genco_PMax_Catalog`) — PAUSED as of audit run.

### Pre-pause activity (5 days serving before pause)

- Asset group `6711451793`: 921 impressions / 15 clicks / 48.74 EGP / 0 conversions / 1.63% CTR
- Merchant Center `5731610966` (feed_label EG) still linked
- 25 assets in the group (12 headlines / 2 long headlines / 4 descriptions / 1 marketing image / 4 squares / 1 logo / 15 search themes) per Phase 2 §2

### Open Phase 2 follow-up #2 — square logo

Was a stopgap product PNG; not verified whether the client has uploaded a true square brand mark yet. **Action — confirm with the client and replace via Google Ads UI** before un-pausing PMax. Brand Guidelines flag will continue to flag this asset group otherwise.

### Reactivation plan

Do NOT un-pause PMax until:
1. Test purchase confirms `7598661558` is firing (§4).
2. Square brand logo replaces the stopgap product PNG.
3. The AR campaign has ≥ 7 days of conversion data so PMax can borrow conversion signal from sibling Search.

Once those three are clear, **reactivate PMax** — the worst thing for PMax is the current paused state, because pause-while-learning kills the algorithm's ability to find the asset combos that win.

---

## 8. Phase 2 open follow-up — status check

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Dual GA4 properties (`G-ZS8DGWQT5W` + `G-JHR423K54K`) — pick one, remove the other | **Pending** | Can't verify from API alone; Phase 2 doc says both were firing on 2026-05-11. Recommend client confirms in Shopify Admin → Online Store → Preferences → Google Analytics. |
| 2 | Real square brand logo for PMax | **Pending** | API doesn't expose asset image distinctiveness; needs visual check in Ads UI. Block on un-pausing PMax. |
| 3 | Hidden conversion `7600841270` ("ads_conversion_Shopping_Cart_1") | **Done — confirmed HIDDEN** | Returned `status: HIDDEN` in conversion-action query. Leave hidden until GA4 category mapping is corrected. |
| 4 | First test purchase verifies `7598661558` firing | **NOT DONE** | Zero conversions in 30 days. Highest-priority item. |
| 5 | Switch to Maximize Conversion Value + tROAS once ≥ 30 conv | **Blocked by #4** | Currently TARGET_SPEND (Maximize Clicks). |
| 6 | Arabic mirror campaign | **DONE — undocumented** | `AW-Genco_Search_AR` launched 2026-05-15 with 3 ad groups, 22 keywords. Need to backfill admin/ docs. |
| 7 | VAT info banner in Account → Billing | **Postponed (per user direction)** | Not a blocker. |

---

## 9. Prioritized recommendations (next 7 days)

In impact × effort order:

| Pri | Action | Effort | Impact | Owner |
|---|---|---|---|---|
| **P0** | **Run a test purchase from a Google-Ads-clicked session** and confirm `7598661558` records the conversion within 24h. If not, reconnect the Shopify Channel app's purchase trigger. | 30 min | Unblocks everything else | AW + client (Shopify Admin access) |
| **P0** | **Add 18 negative keywords** (Tier 1 list in §6) at campaign level on EN_Main. Stops ~10% spend leakage immediately. | 15 min | High | AW (read-only — already in plan) |
| **P0** | **Convert 16 BROAD keywords → PHRASE** in `water racks` ad group (§5). Restores Phase 1 discipline. | 10 min | High | AW |
| **P1** | **Backfill admin/ doc** for `AW-Genco_Search_AR` campaign — what was built, when, by whom, why. The 3 ad groups + 22 keywords + 3 RSAs are currently undocumented. | 30 min | Medium (governance) | AW |
| **P1** | **Re-enable 4 high-strength PAUSED ad groups** — Plant Stands, Garden Tools, Indoor Storage, Hose Hangers — once the BROAD→PHRASE fix is in. The PENDING ad strengths will resolve once they get a real impression count. | 5 min | Medium | AW |
| **P1** | **Drop 3 off-product Arabic keywords** in `folding tables` AR ad group (`كراسي قابلة للطي`, `كراسي رحلات`, `طقم طاولة وكراسي`). | 5 min | Medium | AW |
| **P1** | **Add 11 high-intent positive keywords** (§6 Tier 3) — concentrate the Outdoor Storage 23% CTR ad group and the Arabic price-intent queries. | 20 min | High once enabled | AW |
| **P2** | **Replace POOR RSA in Folding Tables EN** (id 808007254215). Build 12 headlines + 4 descriptions optimised for "folding table egypt" + "heavy duty folding table" + "outdoor folding table". | 1 h | Medium | Creative team |
| **P2** | **Brief client on dual-GA4 cleanup** — Shopify Admin task, AW can advise but client owns the Google Analytics property. | 30 min email + 15 min call | Unblocks primary-source swap | AW Account Lead |
| **P2** | **Un-pause PMax** — *only after* P0 conversion verification passes and the square logo is replaced. PMax learning resets when paused. | 5 min once unblocked | High | AW |
| **P3** | **Raise AR daily budget** from EGP 200 → 350 — IS_lost_budget is 18.6%, meaning we're capacity-constrained on the highest-engagement campaign on the account. Wait until conversions verify before doing this. | 5 min | High once unblocked | AW |
| **P3** | **Change account time zone** from `America/Blanc-Sablon` → `Africa/Cairo`. Possibly irreversible via API once impressions fire; may need a fresh account. Surface to client. | 15 min + decision | Medium (reporting hygiene) | Client decision |
| **P3** | **Build Weber-conquest Search campaign** — keyword set: `weber [model name]` × 19 variants. Tight budget, dedicated landing pages comparing Genco vs Weber on parts availability, price, 2-year warranty. The Meta-side audit also calls this out (Angle 4) — single campaign-conquest play feeds both channels. | 4–6 h | High once conversion plumbing works | AW |

---

## 10. Headline numbers to remember

- **EGP 1,386** spent in 30 days on Google Ads, **0 conversions tracked**, **125 conversions tracked on Meta** for the same store in the same window — the Meta-Google delta proves the Shopify store *is* converting; it's the Google Ads pixel that's blind.
- **5.72% account CTR** with **0.0% conversion rate** is the signature of broken tracking, not bad creative — creative side is healthy enough that Google would auto-throttle if there were no demand.
- **78.9% impression share lost to rank** on EN_Main means every QS-3 keyword is dragging the campaign's auction position down. Fix landing-page alignment on `garden hose`, `garden hose egypt`, `portable grill`, `garden storage`, `شواية فحم`, `كراسي قابلة للطي` first.
- **Outdoor Storage is the breakout** — 23.26% CTR. Concentrate budget here.

---

*Internal audit. Generated by manual GAQL + structured aw-ads MCP queries against the Pipeboard Google Ads account `customers/9033569098`. Companion to the Meta audit at [`meta-ad-audit-2026-05-18.md`](./meta-ad-audit-2026-05-18.md). No mutations were performed during this audit — read-only.*
