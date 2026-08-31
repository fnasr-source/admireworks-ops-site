# MOND Prospect Intelligence Enrichment

Reference for every enrichment wave: actor IDs, input shapes, per-lead cost estimates,
rate limits, and the correct run order.

## Token setup

The Apify token is stored as `APIFY_TOKEN_AW` in Google Cloud Secret Manager
(`admireworks---internal-os`). Local cache lives at `~/.admireworks/apify.env`:

```
APIFY_TOKEN=apify_api_...
```

Store it once:
```bash
printf 'APIFY_TOKEN=apify_api_...' > ~/.admireworks/apify.env
# AND upload to Secret Manager:
printf 'apify_api_...' | gcloud secrets versions add APIFY_TOKEN_AW \
  --project admireworks---internal-os --data-file=-
```

After confirming the integration works, rotate the token in the Apify console
(Settings > Integrations > API tokens) and update the Secret Manager version.

## Actors

### Meta (primary) - `apify/facebook-ads-scraper`

Official Apify-maintained actor. Most reliable for MENA Ad Library.

**Input shape (keyword search, preferred when no page URL):**
```json
{
  "searchTerms": "Company Name",
  "country": "AE",
  "onlyActiveAds": true,
  "maxAds": 15
}
```

**Input shape (page URL, when evidenceUrl already known):**
```json
{
  "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&view_all_page_id=...",
  "maxAds": 15,
  "onlyActiveAds": true
}
```

Key output fields: `adArchiveID`, `pageName`, `pageID`, `snapshot.body.markup.__html` (copy),
`snapshot.images[].original_image_url`, `snapshot.videos[].video_sd_url`,
`snapshot.cta.text`, `startDate`.

**Cost:** ~$0.003-0.008 per run (compute units). At 20 ads per run and 256 MB memory,
expect ~0.1-0.3 CU per company. With 1,000 CU/month free tier, first ~3,000-10,000
companies cost nothing.

**Rate limits:** No hard rate limit, but the actor itself rate-limits to Facebook's
Ad Library. Keep jitter of 1-2s between companies. Sync runs cap at 300s; all our
runs should complete in <90s with maxAds=15.

**Known issues:**
- Keyword searches on generic company names (e.g., "Academy") can return irrelevant pages.
  Always prefer page URL when `runningAds.meta.evidenceUrl` is set (it already resolves to
  the correct Ad Library page). The batch runner checks this and falls back to keyword only
  when no page URL is known.
- The actor's output shape changed between versions. The normalizer in `lib/apify.mjs`
  handles both the `snapshot` nested shape (v2+) and flat shape (v1).

### Google (secondary) - `memo23/google-ad-transparency-scraper-cheerio`

Cheerio-based (lightweight, no browser). Scrapes the Google Ads Transparency Center
by advertiser domain. Fast and cheap.

**Input shape:**
```json
{
  "advertiserDomain": "example.com",
  "region": "AE",
  "maxResults": 8
}
```

Key output fields: `advertiserName`, `adText`, `headline`, `imageUrl`, `screenshot`,
`firstShownDate`, `url` (transparency page link).

**Cost:** very low (<0.05 CU per run). Use for any lead with a known website.

**Limitation:** Google only shows ads from the Transparency Center, which has a 90-day
lookback and only covers search/display/shopping/video. Performance Max and some local
campaigns may not appear.

### TikTok (optional) - `coregent/tiktok-ads-library-creative-center-scraper`

**MENA coverage warning:** TikTok's Ad Library API officially covers EU/EEA/UK only.
For Egypt (EG), UAE (AE), Saudi (SA) advertisers, results may be empty even if they
run TikTok ads. Treat as best-effort: skip when empty, never block on it.

**Input shape:**
```json
{
  "keyword": "Company Name",
  "region": "EG",
  "limit": 5
}
```

**Cost:** ~0.05-0.1 CU per run. Run only for EG/AE/SA leads.

## Batch runner

Script: `firebase/mond/enrich-prospect-intel.mjs`

```bash
# Dry run (no Apify calls, shows what would run and cost estimate)
GOOGLE_APPLICATION_CREDENTIALS=firebase/service-account.json \
  node firebase/mond/enrich-prospect-intel.mjs --tier=diamond --max=50

# Real run: first 50 diamonds
GOOGLE_APPLICATION_CREDENTIALS=firebase/service-account.json \
  node firebase/mond/enrich-prospect-intel.mjs --tier=diamond --max=50 --run

# Resume (checkpoint at drafts/output/enrich-progress.json, skips done)
# just re-run the same command

# Force re-enrich a specific company (debug)
GOOGLE_APPLICATION_CREDENTIALS=firebase/service-account.json \
  node firebase/mond/enrich-prospect-intel.mjs --company="Al Noor Hospital" --run --force

# Gold tier with running ads (after diamonds are done)
GOOGLE_APPLICATION_CREDENTIALS=firebase/service-account.json \
  node firebase/mond/enrich-prospect-intel.mjs --tier=gold --max=200 --run
```

**Run order recommendation:**
1. `--tier=diamond --max=50` (P0: the 50 highest-score diamonds first, see the card)
2. `--tier=diamond` (remaining diamonds, no cap)
3. `--tier=gold --max=300` (gold leads with running ads, scored highest first)

## LinkedIn CSV import

Script: `firebase/mond/import-linkedin-connections.mjs`

```bash
# Dry run (shows match counts, no writes)
GOOGLE_APPLICATION_CREDENTIALS=firebase/service-account.json \
  node firebase/mond/import-linkedin-connections.mjs \
  --csv="/Users/user/Downloads/Connections - Connections.csv"

# Write matches (idempotent - safe to re-run with a fresh export)
GOOGLE_APPLICATION_CREDENTIALS=firebase/service-account.json \
  node firebase/mond/import-linkedin-connections.mjs \
  --csv="/Users/user/Downloads/Connections - Connections.csv" --run
```

**Match priority:**
1. LinkedIn URL slug (most reliable, zero false positives)
2. Email address (when connection shared it with connections)
3. Fuzzy: firstName + lastName + company (token overlap >= 0.8 + company match >= 0.6)

Re-run with the fresh export whenever you download a new one. Idempotent: if a lead
is already tagged with the same `connectedOn` date, the write is skipped.

## Data model

The `adIntel` block on `mondLeads` docs:

```typescript
adIntel: {
  platforms: { meta: boolean, google: boolean, tiktok: boolean }
  adCount: number           // total creatives scraped
  creatives: AdCreative[]   // up to 20 (imageUrl/videoUrl/copy/cta/platform)
  metaPageId: string|null   // resolved Facebook page ID (persisted for re-runs)
  metaPageUrl: string|null  // Ad Library page URL for this company
  critique: [{ label, observation }]  // 2-4 Admire8/MOND lens critiques
  mondDifferentiator: string          // "MOND would..." in lead's language
  critiqueGeneratedAt: string         // ISO timestamp
  scrapedAt: string                   // ISO timestamp of last scrape
  checkedPlatforms: string[]          // which platforms were attempted
  error?: string                      // set if scrape failed
}
```

LinkedIn fields on `mondLeads`:
```
linkedinMutual: boolean         // true = 1st-degree connection
linkedinConnectedOn: string     // e.g. "25 Jan 2025"
linkedinUrl: string             // backfilled from CSV if was missing
```

## Cost budget guide

| Batch | Companies | Meta calls | Google calls | Vertex calls | Est. Apify CU | Est. Vertex cost |
|---|---|---|---|---|---|---|
| Diamond P0 (first 50) | 50 | 50 | ~30 | 50 | ~5-15 CU | ~$0.05 |
| All diamonds (~200) | 200 | 200 | ~120 | 200 | ~20-60 CU | ~$0.20 |
| Gold running ads (~300) | 300 | 300 | ~180 | 300 | ~30-90 CU | ~$0.30 |
| Full gold (~2,000) | 2,000 | 2,000 | ~1,200 | 2,000 | ~200-600 CU | ~$2.00 |

Apify free tier: 1,000 CU/month. Paid plans from $49/mo for 25,000 CU.
Vertex (Gemini 2.5 Flash): approx $0.001 per critique call (700 output tokens).

## On-demand enrichment (single lead)

From the MOND CRM, open a lead and click the refresh button on the IntelligenceCard.
This POSTs to `/api/mond/enrich/{id}`, which fires async enrichment and responds 202.
The card reloads 5 seconds later.

## Firestore data location

- Lead intelligence: `mondLeads/{dedupeKey}.adIntel`
- LinkedIn: `mondLeads/{dedupeKey}.linkedinMutual` / `.linkedinConnectedOn`
- Batch checkpoint: `drafts/Contacts export June 2026/output/enrich-progress.json` (local, not committed)
