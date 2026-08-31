# Reference System: The Slim Game — Architectural Reference

> Gold-standard client project for direct-response health/wellness funnels.
> Stack: Next.js 14 (App Router) + Firebase + Resend + PayMob/Stripe.
> Production domain: `theslimgame.com` | Firebase project: `the-slim-game`
> Source repo: `fnasr-source/kareem-gamal` (branch: `main`)

---

## 1. 3-Channel Event Tracking

The Slim Game records every user action through a unified `track()` function that fans out to four independent sinks. Three of those sinks push data to external ad/analytics platforms, forming the "3-channel" tracking architecture.

### Channel 1 — Client-Side Pixel (Browser)

Fires from the browser via global scripts loaded in the page `<head>`:

| Platform | Global | Trigger |
|---|---|---|
| Meta Pixel | `window.fbq('trackCustom', eventType, data)` | Selective — only events in the `FORWARD_TO_META` array |
| Google Analytics 4 | `window.gtag('event', mappedName, data)` | All events — mapped through `GA4_EVENT_NAME_MAP` |
| Microsoft Clarity | `window.clarity('set', 'lastEvent', eventType)` | All events — sets session tags for heatmap filtering |

**Limitation:** Ad blockers suppress ~30-40% of client-side pixels.

**Key file:** `apps/web/src/lib/analytics/track.ts`

### Channel 2 — Server-Side CAPI (Meta Conversions API)

A Next.js server action that POSTs directly to the Meta Graph API, bypassing ad blockers entirely.

- Fires for HIGH and MEDIUM qualifying tier leads only (not LOW)
- Sends SHA-256 hashed PII (email, phone, externalId)
- Includes `fbp`/`fbc` browser cookies for deduplication with client pixel
- Supports `META_TEST_EVENT_CODE` env var for Events Manager test mode

**Key file:** `apps/web/src/lib/actions/track-meta-event.ts`
**Graph API endpoint:** `https://graph.facebook.com/{version}/{pixelId}/events`
**Env vars:** `NEXT_PUBLIC_META_PIXEL_ID`, `META_ACCESS_TOKEN`, `META_GRAPH_API_VERSION`, `META_TEST_EVENT_CODE`

### Channel 3 — URL-Based PageView (Custom Conversions)

Appends query parameters to the URL before firing a standard `fbq('track', 'PageView')`. Meta Events Manager custom conversions match on URL patterns.

| Conversion Name | URL Rule | Purpose |
|---|---|---|
| Quiz Lead | URL contains `/results` | Tracks quiz completions |
| Qualified Lead | URL contains `qualified=` | Tracks HIGH/MEDIUM tier completions |
| Checkout Started | URL contains checkout path | Tracks checkout starts |
| Program Purchase | URL contains purchase confirmation | Tracks purchases |

**Ad optimization tip:** Switch campaign optimization from "Quiz Lead" to "Qualified Lead" to teach Meta to find buyers, not just quiz-takers.

### Channel 4 — Firestore Event Sink

All events are written to the `siteEvents` Firestore collection via `POST /api/track`. This is the internal data warehouse for the insights dashboard.

- Rate limited: 60 events/min per anonId
- Bot filtered: UA regex rejects crawlers
- Payload size capped: props < 4KB, paths < 512 chars
- Server timestamp added on write

**Key file:** `apps/web/src/app/api/track/route.ts`

### Event Type Registry

Defined in `apps/web/src/types/events.ts` as the `SiteEventType` union:

```
page_view, page_exit, cta_click, video_started, video_progress,
video_completed, video_paused, scroll_depth, form_started,
form_field_focused, form_submitted, form_abandoned, quiz_started,
quiz_question_answered, quiz_completed, quiz_abandoned,
external_link_click, whatsapp_button_click, accordion_toggle,
qualifying_completed
```

Total: 20 event types. Adding a new one requires changes in 3+ files (see workflow SOP: `workflows/tracking-architecture.md`).

### Identity & Attribution

- **Anon ID:** Cookie-based UUID (`tsg_anon`), persists 365 days across visits
- **Session ID:** sessionStorage UUID (`tsg_session`), resets after 30 min idle (matches GA4 default)
- **Lead ID:** Backfilled by stitcher Cloud Function after quiz completion links `anonId` to `leadId`
- **Attribution:** Captured from URL params on every event: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `fbclid`, `gclid`, plus `document.referrer`
- **Dedup:** In-memory set of last 8 events with 1.5s window prevents React strict-mode double-fires

---

## 2. Quiz & Lead Qualification

### Funnel Flow

```
Ad (Meta) -> Quiz (9 questions) -> Email capture -> Results page
  -> Automatic tier calculation from Q5-Q9
  -> Tier routing: HIGH/MEDIUM -> WhatsApp consultation, LOW -> email nurture
```

### Unified Quiz System

**9 questions** with dual-purpose scoring:

- **Q1-Q4:** Behavioral profiling only. Determines IG (Inner Game) vs OG (Outer Game) scores to identify persona: `emotional_eater`, `overwhelmed_juggler`, or `cycle_breaker`
- **Q5-Q9:** Dual-purpose. Contributes to BOTH behavioral profile AND qualifying score

**Key file:** `apps/web/src/lib/quiz-data.ts`

### Qualifying Score Calculation

Only Q5-Q9 carry `qualifyingScore` points (0-10 per answer):

| Question | Theme | Max Points |
|---|---|---|
| Q5 | Daily schedule / availability | 9 |
| Q6 | Decision-making speed | 10 |
| Q7 | Belief in the approach | 10 |
| Q8 | Desired transformation | 10 |
| Q9 | Readiness / objections | 10 |

**Maximum possible:** 50 points (5 questions x 10 max each)

### Tier Thresholds

| Tier | Score Range | Routing |
|---|---|---|
| **HIGH** | >= 38 | WhatsApp consultation + 5-min SLA for sales follow-up |
| **MEDIUM** | 28-37 | WhatsApp + entry offer with softer urgency |
| **LOW** | < 28 | Email nurture sequence, no timer on results page |

**Function:** `computeQualifyingTierFromQuiz(answers)` in `apps/web/src/lib/quiz-data.ts`

### Data Model (Lead Document Fields)

| Field | Type | Description |
|---|---|---|
| `qualifyingTier` | `'high' \| 'medium' \| 'low'` | Computed tier |
| `qualifyingScore` | `number` (0-50) | Sum of Q5-Q9 qualifyingScore values |
| `qualifyingSource` | `'unified_quiz'` | Always set to this value |
| `qualifiedAt` | `Timestamp` | When tier was computed |
| `quizAnswers` | `Record<number, string>` | Full 9-question answer map (questionId -> answerId) |
| `quizProfile` | `string` | Behavioral persona: emotional_eater, overwhelmed_juggler, cycle_breaker |
| `quizScores` | `{ ig: number, og: number }` | Raw IG/OG behavioral scores |

### Quiz Completion API Flow

**Endpoint:** `POST /api/quiz-complete`

On email capture, this route:
1. Creates/updates lead in Firestore with canonical ID (`email.replace(/[^a-z0-9]/g, '_')`)
2. Calls `computeQualifyingTierFromQuiz(answers)` to compute tier
3. Sends quiz results email via Resend (with discount code)
4. Pushes contact to Systeme.io with profile tag
5. Triggers sequence enrollment via `triggerSequenceEnrollment()`
6. Triggers tier-specific sequences via `triggerQualifyingTier()`
7. Fires Meta CAPI `Lead` event for all leads
8. Fires Meta CAPI `qualifying_completed` event for HIGH/MEDIUM only
9. Returns discount code + expiry + tier to client for results page rendering

**Key file:** `apps/web/src/app/api/quiz-complete/route.ts`

### Admin Visibility

Qualifying tier displayed across admin UI:
- **Leads list:** التأهيل column with filter dropdown
- **Lead drawer:** Full section with tier badge, score, and Q5-Q9 answer breakdown
- **Lead detail page:** `/admin/leads/[id]` — calculation explanation
- **Hot leads queue:** Tier badge next to score
- **CRM pipeline:** Tier badge on kanban cards
- **WhatsApp inbox:** Tier badge in conversation list + Q5-Q9 breakdown in lead modal

**Component:** `QualifyingTierExplanation.tsx` — Shows each Q5-Q9 answer with points earned, visual bar, and threshold explanation.

---

## 3. CRM & Lead Scoring

### Scoring Architecture

0-100 normalized score based on 11 weighted dimensions. Config loaded from Firestore (`appConfig/leadScoring`) with 2-min TTL cache; falls back to `DEFAULT_SCORING_CONFIG` in code.

**Key file:** `apps/web/src/lib/crm/lead-scoring.ts`

### Scoring Dimensions

| Dim | Dimension | Max Weight | Example |
|---|---|---|---|
| 1 | Status/Intent | 40 | `checkout_started` = 40, `quiz_completed` = 25, `new` = 3 |
| 2 | Profile Completeness | 20 | hasName +5, hasEmail +5, hasOccupation +5, hasAgeRange +5 |
| 3 | Attribution Quality | 10 | Paid source (fb/ig/google) +10, organic +5 |
| 4 | Recency | 20 | Active <1 day +20, <3 days +15, <7 days +10, <14 days +5 |
| 5 | Entry Offer Intent | 18 | Intent signal +8, qualified for core +10 |
| 6 | Quiz Segment | 18 | Completed +8, segment match +5 to +10 (yo_yo_dieter = 10) |
| 7 | WhatsApp Engagement | 18 | Replied +5, 2+ questions +5, asked price +8 |
| 8 | Qualification (LEGACY) | 0 | Removed — now captured by dim 11 |
| 9 | Email Engagement | ~18 | Opens: 4pts each (cap 3), Clicks: 3pts each (cap 2) |
| 10 | Site Presence | ~15 | Page views: 2pts each above 2 (cap 5 extra), 2min dwell +5 |
| 11 | Qualifying Answers | 25 | HIGH tier +25, MEDIUM +10, LOW +0 |

### Tier Classification

| Tier | Threshold | Recommendation |
|---|---|---|
| **Hot** | score >= 60 | Instant call / hot lead sequence — contact today |
| **Warm** | score >= 30 | Standard sequence — follow up within 24 hours |
| **Cold** | score >= 15 | Nurture list — weekly value content |
| **Dead** | score < 15 | No action (or unsubscribed/invalid override) |

### Follow-Up Engine

Firestore-backed sequence system with admin-editable sequences.

**Key files:**
- `apps/web/src/lib/crm/follow-up-engine.ts` — Sequence CRUD, enrollment management, task scheduling
- `apps/web/src/lib/crm/sequence-trigger-admin.ts` — Server-side auto-enrollment triggers

**Sequence trigger types:**
- `status_change` — fires when lead status transitions (e.g., new -> quiz_completed)
- `tag_added` — fires when quiz profile tag matches (e.g., `quiz_emotional_eater`)
- `qualifying_completed` — fires on qualifying tier write, matches `qualifying_{tier}` tag
- `qualifying_tier` — fires on tier write, matches tier directly (high/medium/low)

**Sequence step scheduling:**
- Supports `dayOffset`, `hoursOffset`, and `minutesOffset` for flexible timing
- Each step creates a `salesTask` assigned to an agent
- Steps support `autoMessage` for pre-composed suggested messages
- Channels: `call`, `whatsapp`, `email`

**Task lifecycle:**
- pending -> in_progress -> completed/cancelled
- Overdue detection: warning (1-2 days), critical (3-6 days), urgent (7+ days)
- Agent workload distribution tracked per agent

### Hot Lead Detection

Hot leads (score >= 60) get:
- Telegram alert to sales team (real-time notification)
- 5-minute SLA for first contact
- Dedicated hot leads queue in admin (`/admin/hot-leads`)
- Priority task creation

---

## 4. Insights Dashboard

### Dashboard Tabs

The admin insights dashboard (`/admin/insights`) provides 6+ analytical views powered by 11 dedicated API endpoints:

| Tab / View | API Endpoint | Data Sources |
|---|---|---|
| Executive Summary | `/api/insights/executive` | Aggregates all below |
| Funnel Analysis | (lib: `insights/funnel.ts`) | siteEvents, leads |
| Engagement | (lib: `insights/engagement.ts`) | siteEvents, page_view, scroll_depth |
| Revenue | `/api/insights/revenue-forecast`, `/api/insights/unit-economics` | payments, leads |
| Creative Correlation | `/api/insights/creative-correlation` | siteEvents, UTM data |
| Lead Journey | `/api/insights/lead-timeline`, `/api/insights/channel-transitions` | siteEvents, leads, messageLogs |
| Acquisition | `/api/insights/cohort-analysis` | leads, attribution |
| Quiz Intelligence | `/api/insights/quiz-intelligence` | quizAnswers, profiles |
| WhatsApp Quality | `/api/insights/whatsapp-quality` | messageLogs, conversationSignals |
| Anomaly Detection | `/api/insights/anomalies` | All collections |
| Recommended Actions | `/api/insights/recommended-actions` | Cross-dimensional |

### Supporting Libraries

All in `apps/web/src/lib/insights/`:

| File | Purpose |
|---|---|
| `funnel.ts` | Funnel stage conversion rates |
| `engagement.ts` | Page-level engagement metrics |
| `revenue.ts` | Revenue forecasting and projections |
| `executive.ts` | Executive summary aggregation |
| `leadJourney.ts` | Per-lead chronological timeline |
| `correlations.ts` | Cross-metric correlation analysis |
| `sourceHealth.ts` | Traffic source quality scoring |
| `email.ts` | Email engagement metrics |
| `google.ts` | GA4 data integration |
| `clarity.ts` | Clarity session replay integration |
| `labels.ts` | Human-readable label generation |
| `range.ts` | Date range utilities |
| `format.ts` | Number/date formatting |
| `types.ts` | Shared type definitions |

---

## 5. Email System

### Resend Integration

**Key file:** `apps/web/src/lib/email/resend.ts`

| Config | Value |
|---|---|
| Provider | Resend (`resend` npm package) |
| From address | `DrkareemGamal@theslimgame.com` |
| Env var | `RESEND_API_KEY` |
| Webhook | `/api/webhooks/resend` — tracks opens, clicks, bounces |

### Email Types

| Trigger | Template | Tags |
|---|---|---|
| Quiz completion | `quiz-result` email with profile + discount code | `category:quiz_result`, `profile:{type}` |
| Purchase confirmation | `purchase-confirmation` email | `category:purchase` |
| Sequence steps | Per-step autoMessage content | `category:sequence` |

### Webhook Processing

`/api/webhooks/resend` processes Resend webhook events (open, click, bounce, complaint) and updates denormalized counters on lead documents (`emailOpenCount`, `emailClickCount`) which feed into the lead scoring system (dim 9).

---

## 6. Payment Integration

### Dual-Provider Architecture

| Provider | Role | Region | Webhook |
|---|---|---|---|
| **PayMob** | Primary | Egypt / MENA | `/api/webhooks/paymob` |
| **Stripe** | Fallback / International | Global | `/api/webhooks/stripe` |

### PayMob Webhook Flow

1. User completes payment on PayMob-hosted checkout
2. PayMob POSTs transaction data to `/api/webhooks/paymob`
3. HMAC signature verified using `PAYMOB_HMAC_SECRET`
4. On success: lead status updated, entry offer enrollment created, tags rebuilt
5. Purchase confirmation email sent via Resend
6. Meta CAPI `Purchase` event fired for attribution
7. GA4 server-side `purchase` event fired
8. Systeme.io customer tag pushed
9. CRM sequence enrollment triggered

**Key file:** `apps/web/src/app/api/webhooks/paymob/route.ts`
**Env vars:** `PAYMOB_HMAC_SECRET`, `PAYMOB_API_KEY`

### Stripe Webhook Flow

Same post-purchase logic as PayMob but uses Stripe signature verification.

**Key file:** `apps/web/src/app/api/webhooks/stripe/route.ts`

---

## 7. Theme System

### Tailwind 4 with @theme Tokens

**Key file:** `apps/web/src/app/globals.css`

Uses Tailwind 4's `@theme inline` directive to bridge CSS custom properties to Tailwind utility classes.

### Token Architecture

```
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  ...
}
```

Light mode defaults are set on `:root`, dark mode on `[data-theme="dark"]`, and Mental Bariatric variant on `.mb-dark`.

### Core Brand Tokens

| Token | Light | Dark |
|---|---|---|
| `--primary` | `#C41E2A` (red) | `#E8564A` (soft red) |
| `--secondary` | `#D4A843` (gold) | `#D4A843` (gold) |
| `--background` | `#F8F7F5` (warm white) | `#0F0F13` (near black) |
| `--foreground` | `#1A1A2E` (dark navy) | `#E5E7EB` (light gray) |
| `--card` | `#FFFFFF` | `#1A1A23` |
| `--success` | `#059669` | `#10B981` |

### TSG Brand Colors (Public Pages)

| Token | Value | Usage |
|---|---|---|
| `--color-tsg-orange` | `#E8801A` | Mental Bariatric accent |
| `--color-tsg-green` | `#1E7A45` | CTA button base |
| `--color-tsg-sage` | `#28A745` | Primary CTA (squishy 3D button) |
| `--color-tsg-gold` | `#E9B44C` | Warning, premium accent |
| `--color-tsg-cream` | `#FFFBF7` | Page backgrounds |
| `--color-tsg-dark` | `#1A1A2E` | Dark text, dark mode base |

### RTL-First Arabic Typography

```css
html { direction: rtl; }
body { line-height: 1.75; }  /* Relaxed for Arabic */
p { line-height: 1.8; }      /* Generous paragraph spacing */
h1-h6 { line-height: 1.45; } /* Breathing room for multi-line Arabic */
```

Font stack: `var(--font-heading)` -> Cairo, Tajawal, Noto Kufi Arabic (Arabic serif feel)
Body font: `var(--font-sans)` -> DM Sans, Cairo, Tajawal (clean sans)

### Component Classes

| Class | Purpose |
|---|---|
| `.btn-primary` | Squishy 3D green CTA with border-bottom-4 and hover translate |
| `.btn-secondary` | Orange outline button |
| `.brand-card` | White card with border, rounded-2xl, shadow-md, hover shadow-xl |
| `.mb-card` | Mental Bariatric dark card variant |

---

## 8. Admin Architecture

### Scale

62+ admin page routes, covering every operational function. All protected by Firebase Auth (Google Sign-In) + email allowlist.

### Admin Route Map

| Section | Routes | Purpose |
|---|---|---|
| **Dashboard** | `/admin` | Main admin home |
| **Leads** | `/admin/leads`, `/admin/leads/[id]` | Lead list, detail, drawer |
| **Hot Leads** | `/admin/hot-leads` | Priority queue (score >= 60) |
| **CRM** | `/admin/crm`, `/admin/crm/pipeline`, `/admin/crm/scoring`, `/admin/crm/scoring/settings`, `/admin/crm/tasks`, `/admin/crm/sequences`, `/admin/crm/team`, `/admin/crm/reports`, `/admin/crm/reports/campaign`, `/admin/crm/reports/public` | Full CRM suite |
| **Sales** | `/admin/sales`, `/admin/sequences` | Sales tasks, sequence management |
| **WhatsApp** | `/admin/whatsapp`, `/admin/whatsapp/ai-replies`, `/admin/whatsapp/queue`, `/admin/whatsapp/broadcast` | Messaging hub |
| **Email** | `/admin/emails`, `/admin/email-templates` | Email management |
| **Entry Offer** | `/admin/entry-offer`, `/admin/entry-offer/[enrollmentId]` | 21-day program admin |
| **Payments** | `/admin/payments` | Payment records |
| **Content** | `/admin/content`, `/admin/content/[id]`, `/admin/content-management`, `/admin/content-management/[docId]`, `/admin/content-management/[docId]/history` | Content CMS |
| **Blog** | `/admin/blog`, `/admin/blog/editor` | Blog management |
| **Ad Copies** | `/admin/ad-copies`, `/admin/ad-copies/[id]` | Ad creative management |
| **Analytics** | `/admin/analytics`, `/admin/insights`, `/admin/events` | Analytics + insights |
| **A/B Tests** | `/admin/ab-tests`, `/admin/ab-tests/[testId]` | Test management |
| **Campaign Flows** | `/admin/campaign-flows`, `/admin/campaign-flows/[id]` | Funnel management |
| **Cohorts** | `/admin/cohorts` | Cohort analysis |
| **Customers** | `/admin/customers` | Customer records |
| **Onboarding** | `/admin/onboarding` | Post-purchase onboarding |
| **Social** | `/admin/social`, `/admin/social/callback` | Social media management |
| **Notifications** | `/admin/notifications` | Alert management |
| **Approvals** | `/admin/approvals` | Content approvals |
| **Revisions** | `/admin/revisions` | Revision requests |
| **Health** | `/admin/health` | System health monitoring |
| **AI Monitor** | `/admin/ai-monitor` | AI reply monitoring |
| **SOP** | `/admin/sop` | Operational procedures |
| **Logs** | `/admin/logs` | System logs |
| **Client Portal** | `/admin/client-portal`, `/admin/client-portal/dashboard`, `/admin/client-portal/[clientId]` | White-label portal |
| **Integrations** | `/admin/integrations/telegram`, `/admin/settings/integrations` | External integrations |
| **Settings** | `/admin/settings/users`, `/admin/settings/whatsapp/ai`, `/admin/settings/whatsapp/ai/test`, `/admin/settings/whatsapp/templates` | System settings |
| **Systeme.io** | `/admin/systeme` | Systeme.io sync |

### Pipeline Kanban

CRM pipeline (`/admin/crm/pipeline`) displays leads as kanban cards with:
- Qualifying tier badge
- Lead score with color coding
- Status progression columns
- Drag-and-drop stage advancement
- WhatsApp quick-action buttons

---

## 9. Key Products

| Product | Price | Description | Dashboard |
|---|---|---|---|
| Entry Offer | ~99 AED | 21-day program, token-based access | `/entry-offer/dashboard?token=...` |
| Mental Bariatric | Premium | 12-week full program | Admin enrollment |
| Dress Challenge | Varies | Cohort-based program | Admin enrollment |

---

## 10. Integration Map

| Service | Purpose | Key |
|---|---|---|
| Firebase Firestore | Primary database | Admin SDK |
| Firebase Auth | Admin access control | Google Sign-In + allowlist |
| Firebase App Hosting | Production deployment | Auto-deploy on `main` |
| Firebase Cloud Functions | Background processing | `firebase/functions/` |
| Resend | Transactional email | `RESEND_API_KEY` |
| Meta Pixel | Client-side tracking | `NEXT_PUBLIC_META_PIXEL_ID` |
| Meta CAPI | Server-side tracking | `META_ACCESS_TOKEN` |
| Google Analytics 4 | Web analytics | `NEXT_PUBLIC_GA4_ID` |
| Microsoft Clarity | Heatmaps & session replay | `NEXT_PUBLIC_CLARITY_ID` |
| PayMob | Egypt/MENA payments | `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET` |
| Stripe | International payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Systeme.io | Email marketing automation | API key |
| Telegram | Sales team alerts | Bot token + chat ID |
| WhatsApp Business API | 2-way messaging | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |

---

## 11. Reuse Guide

When adapting this system for a new client:

1. **Tracking:** Copy `track.ts` + `track-meta-event.ts` + `/api/track/route.ts` + `events.ts` and adjust pixel IDs
2. **Quiz:** Copy `quiz-data.ts`, rewrite questions Q1-Q9 for the new domain, keep the scoring structure
3. **Lead Scoring:** Copy `lead-scoring.ts`, adjust `statusWeights` and `quizSegmentMatch` for new personas
4. **Follow-Up Engine:** Copy `follow-up-engine.ts` + `sequence-trigger-admin.ts`, create new sequence templates
5. **Theme:** Copy `globals.css`, replace brand tokens (primary, secondary, TSG colors)
6. **Email:** Copy `resend.ts`, update FROM address and template HTML
7. **Payments:** Copy webhook routes, configure PayMob/Stripe keys for new merchant account
8. **Admin:** Selectively copy admin routes needed for the new project scope

---

## 12. Existing Internal AW SOP Paths

| Asset | Path |
|---|---|
| Strategy presentation entry point | `ops/strategy-system/client-strategies/The Slim Game - strategy draft/presentation/index.html` |
| Presentation logic | `ops/strategy-system/client-strategies/The Slim Game - strategy draft/presentation/app.js` |
| Visual prompt notes | `ops/strategy-system/client-strategies/The Slim Game - strategy draft/phase2-image-prompts.md` |
| Dashboard exposure | `ops/dashboards/strategies/index.html` |
| Reuse reference note | `clients/Basseqat/kb/project/SOURCE_PATTERN.md` |
| Admin and system reuse note | `clients/Basseqat/kb/project/PROJECT_PROFILE.md` |
| Tracking architecture SOP | `ops/direct-response-playbook/workflows/tracking-architecture.md` |
| Quiz lead qualification SOP | `ops/direct-response-playbook/workflows/quiz-lead-qualification.md` |
| CRM lead scoring SOP | `ops/direct-response-playbook/workflows/crm-lead-scoring.md` |
