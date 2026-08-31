# Insights Dashboard

Use this workflow when setting up the analytics dashboard for a direct-response client. Documents the tab architecture, data sources, API endpoints, and monitoring patterns from the production reference implementation.

---

## Tab Architecture

The insights dashboard uses a tabbed interface with six primary views. Each tab is a server-rendered page that fetches data in parallel for the selected date range.

| Tab key | Label | Icon | Data source(s) | Purpose |
|---|---|---|---|---|
| `acquisition` | Source/Acquisition | Compass | GA4, Firestore leads, attribution data | Where leads come from, source quality, UTM breakdowns |
| `journey` | Conversion Journey | Stairs | Firestore events, leads, payments | Full funnel visualization from visit to purchase |
| `engagement` | Visitor Behavior | Eye | Firestore siteEvents, Clarity | Page views, sessions, scroll depth, video, quiz funnel |
| `revenue` | Sales/Revenue | Money | Firestore payments, leads | Revenue by product, cohort, source, payment method |
| `creative` | Ads | Megaphone | Meta Ads API, Firestore CTA clicks | Ad performance, creative correlation with site behavior |
| `email` | Email | Mail | Resend events, Firestore emailEvents | Email delivery, opens, clicks, bounces, sequence performance |

### Tab data loading pattern

Each tab loads only its own data to keep server response fast:

```typescript
const [engagement, funnelReport, revenueData, acquisitionData, emailData, marketing, sourceHealth] =
    await Promise.all([
        loadEngagement ? getEngagementSummary(dateRange) : null,
        tab === "journey" ? buildFunnelReport(dateRange) : null,
        tab === "revenue" ? getRevenueSummary(dateRange) : null,
        tab === "acquisition" ? getAcquisitionBreakdown(dateRange) : null,
        tab === "email" ? getEmailInsightsSummary(dateRange) : null,
        tab === "creative" ? getMarketingMetrics(dateRange, integrations) : null,
        getInsightsSourceHealth(dateRange, { integrations, marketing: null }),
    ]);
```

### Date range control

The dashboard supports:

- Preset ranges: 7d, 14d, 30d, 90d
- Custom date picker: `from` and `to` query params
- All ranges passed via URL search params so links are shareable

---

## Executive Summary

A KPI snapshot component available on the main admin dashboard and as a standalone view.

### North Star metrics

| Metric | Description | Source |
|---|---|---|
| Revenue (total) | Sum of confirmed payments in the period | Firestore `payments` |
| Qualified lead velocity | Qualified leads per day (HIGH + MEDIUM tier) | Firestore `leads` |
| Lead quality score | Composite score (0-100) from quiz tier distribution | Firestore `leads` |
| Overall conversion rate | Visits to purchase percentage | Firestore `siteEvents` + `payments` |

### Funnel health indicator

A single badge (`healthy`, `attention`, `critical`) computed from:

- Conversion rate trend vs. previous period
- Lead quality trend
- Revenue trend
- SLA compliance rate

### Executive alerts

Automated alerts surfaced at the top of the summary:

- Revenue dropped >20% vs. previous period
- Lead quality score declined
- Conversion rate below threshold
- SLA breach rate above threshold

---

## Data Sources

### GA4 (Google Analytics 4)

- **Connected via**: GA4 Data API (`analyticsdata.googleapis.com`)
- **Data pulled**: Sessions, page views, source/medium/campaign, user demographics
- **Configuration**: GA4 property ID stored in `appConfig/integrations` Firestore doc
- **Env var**: `GA4_PROPERTY_ID` or stored in admin settings

### Meta Ads

- **Connected via**: Meta Marketing API
- **Data pulled**: Campaign spend, impressions, clicks, CPM, CPC, CTR, conversions
- **Configuration**: Ad account ID, access token stored in integrations config
- **Env vars**: `META_AD_ACCOUNT_ID`, `META_ACCESS_TOKEN`

### Microsoft Clarity

- **Connected via**: Clarity API or embedded script events
- **Data pulled**: Heatmaps, session recordings, rage clicks, dead clicks, scroll depth
- **Configuration**: Clarity project ID
- **Env var**: `NEXT_PUBLIC_CLARITY_PROJECT_ID`

### Firestore events

- **Collection**: `siteEvents` -- real-time event stream from the public site
- **Events tracked**: `page_view`, `page_exit`, `cta_click`, `video_started`, `video_progress`, `video_completed`, `scroll_depth`, `quiz_started`, `quiz_completed`, `quiz_abandoned`, `whatsapp_button_click`, `qualifying_completed`
- **Schema**: `{ type, path, target?, anonId?, leadId?, isInternal?, createdAt }`
- **Ingestion**: `POST /api/track` with event type allowlist validation

### Firestore collections

| Collection | Insights use |
|---|---|
| `leads` | Lead counts, source attribution, qualifying tiers, status distribution |
| `payments` | Revenue, product mix, payment method split, cohort revenue |
| `siteEvents` | Behavioral analytics, funnel steps, engagement metrics |
| `emailEvents` | Email delivery, opens, clicks, bounces |
| `sequenceEnrollments` | Sequence performance, step completion rates |
| `appConfig/integrations` | Data source configuration and credentials |

---

## Live Event Feed

A real-time component that shows the last 50 site events as they fire. Uses Firestore `onSnapshot` for instant updates.

### Purpose

- Verify tracking is alive and working
- Monitor site activity in real time during campaign launches
- Spot unusual patterns immediately

### Event display

Each event shows:

| Field | Display |
|---|---|
| Type | Icon + Arabic label (e.g., "page_view" -> "Eye + Visit page") |
| Path | Humanized page name (e.g., "/quiz" -> "Quiz page") |
| Target | If present, shown as a badge (e.g., CTA name, video ID) |
| Time | HH:MM:SS timestamp |
| Lead link | "lead" badge if `leadId` is present, "anon" otherwise |

### Filtering

- Internal admin paths (`/admin/*`) are excluded automatically
- Internal traffic is filtered by `isInternal` flag

---

## Source Health Monitoring

A status strip shown across all tabs that reports the health of each data source.

### Statuses

| Status | Meaning | Display |
|---|---|---|
| `connected` | Data source active and returning fresh data | Green badge |
| `low_data` | Connected but returning less data than expected | Gray badge |
| `needs_setup` | Data source not yet configured | Amber badge |
| `warning` | Data source returning errors or stale data | Red badge |

### Monitored sources

- Firestore siteEvents (behavioral tracking)
- Firestore leads (lead data)
- Firestore payments (revenue data)
- GA4 property (traffic analytics)
- Meta Ads account (ad performance)
- Clarity project (behavior analytics)
- Resend (email delivery)

### Health check logic

For each source, the health check evaluates:

1. Is the source configured? (credentials present)
2. Is the source returning data for the selected period?
3. Is the data volume reasonable vs. historical baseline?
4. Are there any API errors?

---

## API Endpoints

All insights API endpoints live under `/api/insights/`:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/insights/executive` | GET | Executive summary: north star metrics, funnel health, alerts |
| `/api/insights/anomalies` | GET | Anomaly detection: CAC spikes, conversion drops, quality declines, volume anomalies |
| `/api/insights/recommended-actions` | GET | AI-generated recommended actions based on current data patterns |
| `/api/insights/cohort-analysis` | GET | Cohort-based retention and revenue analysis |
| `/api/insights/revenue-forecast` | GET | Revenue projection based on current pipeline and conversion rates |
| `/api/insights/unit-economics` | GET | CAC, LTV, payback period, and unit-level profitability |
| `/api/insights/channel-transitions` | GET | How leads move between acquisition channels over time |
| `/api/insights/creative-correlation` | GET | Correlation between ad creatives and on-site behavior |
| `/api/insights/quiz-intelligence` | GET | Quiz completion rates, answer distributions, tier breakdowns |
| `/api/insights/whatsapp-quality` | GET | WhatsApp conversation quality metrics and response times |
| `/api/insights/lead-timeline` | GET | Unified timeline of all lead touchpoints |

All endpoints accept `start` and `end` query params (ISO date strings) for the date range.

---

## Anomaly Detection

The anomaly detection system monitors for:

### Types

| Type | Description | Severity logic |
|---|---|---|
| `cac_spike` | Customer acquisition cost increased significantly | Critical if >50% increase, warning if >25% |
| `conversion_drop` | Conversion rate dropped below baseline | Critical if >30% drop, warning if >15% |
| `quality_drop` | Lead quality score declined | Warning if >10% decline |
| `volume_spike` | Unusual traffic volume increase | Info for positive, warning if from suspicious sources |
| `volume_drop` | Traffic volume dropped unexpectedly | Warning if >30% drop |

### Severity levels

- **Critical** (red): Requires immediate action; likely revenue impact
- **Warning** (amber): Needs investigation within 24 hours
- **Info** (blue): Notable pattern worth monitoring

### Recommended actions

Each anomaly includes a recommended action. The `/api/insights/recommended-actions` endpoint aggregates all current anomalies and generates prioritized action items.

---

## Engagement Metrics

The Engagement tab tracks detailed visitor behavior:

| Metric | Source | Description |
|---|---|---|
| Total page views | `siteEvents` (page_view) | Raw page view count |
| Unique visitors | `siteEvents` (distinct anonId) | Deduplicated visitor count |
| Sessions | `siteEvents` (session grouping) | Visit sessions |
| Avg session duration | `siteEvents` (session start/end) | Average time per session |
| Avg page dwell time | `siteEvents` (page_view/exit diff) | Average time on a page |
| Bounce rate | `siteEvents` | Single-page sessions percentage |
| Top pages | `siteEvents` (page_view aggregation) | Most visited pages |
| Video engagement | `siteEvents` (video events) | Start, progress, completion rates |
| CTA clicks | `siteEvents` (cta_click) | Button click tracking |
| Scroll depth | `siteEvents` (scroll_depth) | 25th, 50th, 75th, 100th percentile |
| Quiz funnel | `siteEvents` (quiz events) | Started, completed, abandoned, completion rate |
| WhatsApp clicks | `siteEvents` (whatsapp_button_click) | WhatsApp CTA engagement |

---

## Setup Checklist

### Data source connections

- [ ] GA4 property ID configured in admin settings
- [ ] Meta Ads account ID and access token configured
- [ ] Clarity project ID set as env var
- [ ] Firestore `siteEvents` collection active (tracking script deployed on public site)
- [ ] Resend webhook connected for email events
- [ ] Admin integrations page verified (`/admin/settings/integrations`)

### Dashboard verification

- [ ] All six tabs loading without errors
- [ ] Source health strip showing all sources as `connected`
- [ ] Live event feed showing real-time events
- [ ] Date range selector working (presets and custom)
- [ ] Executive summary KPIs populated
- [ ] Anomaly alerts appearing when thresholds are crossed

### Tracking verification

- [ ] Open the public site and perform actions (page view, quiz start, CTA click)
- [ ] Verify events appear in the live event feed within seconds
- [ ] Verify GA4 real-time report shows the same session
- [ ] Verify Meta pixel events fire in Meta Events Manager test tool
- [ ] Verify Clarity records the session
