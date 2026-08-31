# E-Commerce Fashion Research Template

> **Verticals:** Fashion, apparel, modest fashion, accessories, jewelry
> **Proven on:** Ein Abayaa (March 2026) — Saudi abaya e-commerce, mid-premium positioning
> **Estimated cost:** $1-3 in API calls + free browser research
> **Estimated time:** 4-6 hours of agent execution

---

## Placeholders

Replace these tokens throughout the template before execution:

| Token | Description | Example (Ein Abayaa) |
|-------|-------------|---------------------|
| `{BRAND}` | Client brand name | Ein Abayaa |
| `{BRAND_AR}` | Brand name in Arabic (if applicable) | عين عباية |
| `{PRODUCT}` | Primary product category | abaya |
| `{PRODUCT_AR}` | Product category in Arabic (if applicable) | عباية |
| `{COUNTRY}` | Primary target market | Saudi Arabia |
| `{COUNTRY_CODE}` | ISO country code | SA |
| `{CURRENCY}` | Local currency code | SAR |
| `{PLATFORM}` | E-commerce platform | Zid |
| `{STORE_URL}` | Client's store URL | einabayaa.com |
| `{INSTAGRAM}` | Client Instagram handle | @einabayaa |
| `{COMPETITORS}` | Comma-separated competitor names | Sadal, Laftah, OYA, Lagate, Daphne HC |

---

## Phase 1: Market Research (Perplexity + Tavily)

### 1A: Market Size and Growth

**Tool:** Perplexity Sonar
**Output file:** `market-environment-scan.md`

Queries:
1. `{COUNTRY} e-commerce market size 2025 2026 growth rate forecast`
2. `{COUNTRY} fashion e-commerce market size women apparel online retail`
3. `{PRODUCT} market size {COUNTRY} modest fashion industry statistics`
4. `{COUNTRY} e-commerce trends Vision 2030 digital transformation online shopping`
5. `{COUNTRY} mobile commerce statistics smartphone penetration online shopping behavior`
6. `{COUNTRY} social commerce statistics Instagram TikTok shopping`

**Tool:** Tavily Advanced Search
**Output file:** `market-environment-scan.md`

Queries:
7. `{COUNTRY} seasonal shopping patterns fashion Ramadan Eid wedding season`
8. `global modest fashion market size growth trends 2025 2026`

**Quality gate:** Minimum 3 independent sources for primary market size figure. At least 1 source must be current-year.

### 1B: Payment and Logistics Landscape

**Tool:** Perplexity Sonar
**Output file:** `market-environment-scan.md`

Queries:
9. `{COUNTRY} buy now pay later BNPL adoption rate Tabby Tamara conversion impact`
10. `{COUNTRY} e-commerce payment methods COD card Apple Pay statistics`
11. `{COUNTRY} e-commerce shipping logistics delivery expectations same day`
12. `{COUNTRY} e-commerce platform comparison {PLATFORM} Shopify Salla features`

---

## Phase 2: Competitor Discovery and Profiling

### 2A: Competitor Discovery

**Tool:** Exa (structured entity search)
**Output file:** `data/competitor-candidates.md`

Queries:
1. `{PRODUCT} brand {COUNTRY} online store` (content search)
2. `{PRODUCT} e-commerce {COUNTRY} Instagram` (content search)
3. `luxury {PRODUCT} {COUNTRY} designer` (content search)
4. `affordable {PRODUCT} {COUNTRY} online shopping` (content search)

**Goal:** Identify 8-12 candidate competitors across value, mid-range, premium, and luxury tiers.

### 2B: Competitor Store Scraping

**Tool:** Firecrawl
**Output file:** `competitor-scan.md`, `competitor-pricing.md`

For each competitor store URL, scrape:
1. Homepage — brand positioning, navigation structure, messaging, trust signals
2. Product listing page — product names, prices, categories, images
3. Individual product pages (2-3 per competitor) — pricing, size options, BNPL display, reviews, shipping info

**Quality gate:** Minimum 5 competitors profiled. At least 3 must have verified pricing from product pages.

### 2C: Competitor Pricing Matrix

**Tool:** Manual compilation from Firecrawl data
**Output file:** `competitor-pricing.md`

Build a pricing comparison table with:
- Entry-level, mid-range, and premium price points per competitor
- Currency normalization to client's local currency
- BNPL availability per competitor
- Free shipping thresholds
- Platform identification

---

## Phase 3: Customer Research

### 3A: Customer Motivations and Barriers

**Tool:** Perplexity Sonar
**Output file:** `customer-language-bank.md`

Queries:
1. `{COUNTRY} women online {PRODUCT} purchase motivations factors decision`
2. `{COUNTRY} online {PRODUCT} shopping barriers concerns objections sizing returns`
3. `{COUNTRY} Gen Z fashion shopping behavior preferences social media influence`
4. `{COUNTRY} luxury fashion buyer profile high income women online shopping behavior`

### 3B: Language Mining

**Tool:** Chrome browser (Instagram, TikTok, competitor reviews)
**Output file:** `customer-language-bank.md`

Tasks:
1. Visit `{INSTAGRAM}` — read 20+ recent post comments, capture recurring phrases (desire, praise, questions)
2. Visit client's TikTok — identify top-performing videos, capture comment language
3. Visit competitor stores with reviews (e.g., Sadal's Salla store) — capture customer review language for desire, pain, trust
4. Search Instagram for `#{PRODUCT_AR}` and `#{PRODUCT}` hashtags — capture trending phrases and hashtags

### 3C: Search Language

**Tool:** Chrome browser (Google Trends)
**Output file:** `customer-language-bank.md`

Tasks:
1. Google Trends — search `{PRODUCT_AR}` in `{COUNTRY}`, past 12 months. Record: interest over time, seasonal peaks, related queries, rising queries.
2. Google Trends — compare client brand name vs top 3 competitor brand names. Record relative search interest.

**Quality gate:** Language bank must have 5+ entries per category (desire, pain, objection, trust, search). Minimum 40% tagged as FACT (observed/cited).

---

## Phase 4: Channel Benchmarks

**Tool:** Perplexity Sonar
**Output file:** `channel-benchmarks.md`

Queries:
1. `Meta ads fashion e-commerce benchmarks 2026 CPM CPC CTR CVR ROAS clothing`
2. `TikTok ads e-commerce benchmarks 2026 fashion clothing CPM engagement rate`
3. `email marketing fashion e-commerce benchmarks 2026 Klaviyo flow revenue open rate`
4. `WhatsApp marketing {COUNTRY} statistics open rate abandoned cart recovery fashion`
5. `Instagram Reels vs Stories vs Feed engagement rate fashion e-commerce 2026`
6. `influencer marketing {COUNTRY} fashion ROI micro nano engagement rate`

**Quality gate:** At least 3 channels benchmarked. At least 1 source from current calendar year.

---

## Phase 5: Content Intelligence and Ad Landscape

### 5A: Meta Ad Library Audit

**Tool:** Chrome browser
**Output file:** `data/meta-ad-library-scan.md`

Steps:
1. Navigate to facebook.com/ads/library
2. Set country filter to `{COUNTRY}`, status to "Active ads"
3. Search `{PRODUCT_AR}` (primary product in local language) — record total active ads
4. Search `{BRAND_AR}` or `{BRAND}` — record client's own ad count, creative formats, copy approach, running duration, landing pages
5. Search each competitor name — record ad count, creative formats, copy patterns
6. Analyze creative patterns across all ads:
   - What percentage are product-catalog style vs storytelling vs UGC?
   - What language (Arabic, English, bilingual)?
   - What CTAs are used?
   - Any retargeting-specific creative?
   - Any BNPL messaging in ad copy?

### 5B: Content Trend Research

**Tool:** Perplexity Sonar
**Output file:** `content-intelligence.md`

Queries:
1. `{COUNTRY} fashion content trends 2025 2026 short video Instagram TikTok`
2. `{COUNTRY} modest fashion influencers top accounts Instagram TikTok`

**Tool:** Tavily
3. `DTC fashion brand content strategy e-commerce social media 2026`
4. `fashion e-commerce lead magnet HVCO quiz lookbook email capture`

### 5C: Client Social Media Audit

**Tool:** Chrome browser
**Output file:** `kb/social-media-audit.md` (stored in KB, not research)

Tasks:
1. Visit `{INSTAGRAM}` — record follower count, posting frequency, engagement rate (likes/comments per post), top-performing content formats, bio and highlights structure
2. Visit client TikTok — record follower count, top videos by views, content format patterns
3. Screenshot or note any viral content (1000+ likes on Instagram, 100K+ views on TikTok)

---

## Phase 6: Client Store Audit

**Tool:** Firecrawl + Chrome browser
**Output file:** `kb/current-store-audit.md` (stored in KB)

Tasks:
1. Scrape client's current store homepage and 2-3 product pages via Firecrawl
2. Visually inspect in Chrome browser:
   - Mobile experience (responsive layout, load speed perception)
   - BNPL messaging visibility (per-installment amounts on product pages?)
   - Review/social proof display
   - Email capture mechanism
   - WhatsApp integration
   - Size guide accessibility
   - Product photography quality
   - Navigation and collection organization

---

## Expected Output Files

### Standard Outputs (required for every fashion e-commerce engagement)

| File | Location | Description |
|------|----------|-------------|
| `research-report.md` | `research/` | Executive synthesis — key findings, StoryBrand foundations, personas, channel strategy, funnel design, HVCO recommendations |
| `competitor-scan.md` | `research/` | Detailed profiles of 5+ competitors with positioning, product range, messaging, CRO, weaknesses |
| `competitor-pricing.md` | `research/` | Pricing comparison matrix with tier mapping and BNPL visibility |
| `customer-language-bank.md` | `research/` | Desire, pain, objection, trust, praise, and search language in target dialect |
| `market-environment-scan.md` | `research/` | Market size, growth, payment landscape, logistics, platform comparison, seasonal patterns |
| `channel-benchmarks.md` | `research/` | CPM/CPC/CTR/CVR/ROAS by channel with regional adjustments |
| `content-intelligence.md` | `research/` | Content trends, influencer profiles, ad creative patterns |
| `source-log.md` | `research/` | Complete audit trail of every API call and manual scan with costs |
| `research-budget.md` | `research/` | Budget tracking — planned vs actual spend by tool |
| `CONTAMINATION_CHECKLIST.md` | `research/` | Client-specific vs reusable doctrine separation |
| `research-review.md` | `research/` | Human review results — claim quality, source quality, market fit |

### Raw Data Files (stored in `research/data/`)

| File | Source | Content |
|------|--------|---------|
| `meta-ad-library-scan.md` | Chrome browser | Full ad library audit with competitor ad counts and creative analysis |
| `google-trends-{PRODUCT}-{COUNTRY_CODE}.md` | Chrome browser | Google Trends data with seasonal patterns and rising queries |
| `competitor-candidates.md` | Exa | Initial competitor discovery list before filtering |
| `*.json` | API responses | Raw Perplexity, Firecrawl, Exa, and Tavily responses |

---

## Industry-Specific Considerations for Fashion E-Commerce

### Seasonal Patterns
Fashion is highly seasonal. Research must identify and document:
- **Religious calendar:** Ramadan and Eid al-Fitr (peak spending), Eid al-Adha, Hajj season
- **Cultural calendar:** National Day celebrations, wedding season, back-to-school
- **Fashion calendar:** Collection launches (Spring/Summer, Fall/Winter), resort/cruise collections
- **Commercial calendar:** Black Friday/White Friday, 11.11, end-of-season sales

Align the client's product launch calendar against these peaks. The Ein Abayaa engagement revealed that timing the Summer Shade 2026 launch with post-Ramadan Eid spending created a natural acceleration window.

### BNPL as Conversion Multiplier
In MENA fashion e-commerce, BNPL (Tabby, Tamara) is not optional. Research must document:
- BNPL adoption rate in the target market
- AOV uplift when BNPL is prominently displayed
- Competitor BNPL visibility (who shows per-installment amounts on product pages vs who just has a footer badge)
- The specific BNPL providers active in the market

### Influencer Economics
Fashion e-commerce in MENA relies heavily on influencer marketing. Research must capture:
- Micro vs macro influencer engagement rates in the target market
- Typical collaboration costs by tier
- Which influencers are already working with competitors
- UGC potential — does the client have existing viral organic content that proves the format?

### Sizing and Returns Anxiety
Online fashion has a structural trust problem around fit. Research must document:
- How competitors handle sizing (size guides, custom measurements, fit guarantee)
- Return policies and their prominence
- Whether competitors use try-on content to address fit anxiety
- Customer language specifically about sizing uncertainty

### Product Photography and Content Standards
Fashion e-commerce conversion is driven by visual quality. Research should benchmark:
- Number of product images per item (competitor average)
- Video vs photo ratio on product pages
- Lifestyle/editorial vs studio/product-only photography
- Model diversity and styling context

### Platform Considerations (Zid, Salla, Shopify)
MENA fashion e-commerce runs on specific platforms. Research should note:
- Which platform each competitor uses
- Platform-specific limitations (e.g., Salla's image-heavy templates with poor text rendering)
- Integration capabilities (BNPL, review systems, email/WhatsApp automation)
- Mobile experience quality by platform
