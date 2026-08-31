# Tracking Architecture — 3-Channel Event System

> SOP for implementing the proven 3-channel tracking system from The Slim Game.
> Reference implementation: `/Users/user/Documents/IDE Projects/The Slim Game/apps/web/src/lib/analytics/`

---

## Overview

Every direct-response project must track user behavior through three independent channels that fire in parallel. No single channel is reliable alone — ad blockers suppress client pixels, server-side events miss browser context, and URL-based conversions are limited to page-level signals. The three channels together give complete coverage.

```
User Action
   |
   +-> Channel 1: Client-side pixel (fbq, gtag, clarity)  -- ~60-70% delivery (blocked by ad blockers)
   |
   +-> Channel 2: Server-side CAPI (Meta Graph API)        -- ~100% delivery (bypasses ad blockers)
   |
   +-> Channel 3: URL-based PageView (custom conversions)  -- ~100% delivery (standard pixel PageView)
   |
   +-> Firestore sink (/api/track -> siteEvents collection) -- internal data warehouse
```

---

## Channel 1: Client-Side Pixel

### What It Does

Fires events directly from the user's browser to Meta Pixel, Google Analytics 4, and Microsoft Clarity using their global JavaScript SDKs.

### How to Implement

**Step 1 — Load pixel scripts in the page `<head>`**

Add Meta Pixel, GA4 gtag, and Clarity snippets to the root layout. Use the project's Pixel ID, GA4 Measurement ID, and Clarity Project ID from environment variables:

| Env Var | Purpose |
|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel ID (e.g., `1469125784846926`) |
| `NEXT_PUBLIC_GA4_ID` | GA4 Measurement ID (e.g., `G-XXXXXXXXXX`) |
| `NEXT_PUBLIC_CLARITY_ID` | Microsoft Clarity project ID |

**Step 2 — Create the unified tracker**

Create `lib/analytics/track.ts` with a single `track()` function that fans out to all sinks. The reference implementation structure:

```typescript
export function track(
    type: SiteEventType,
    overrides: Partial<Omit<SiteEvent, "anonId" | "sessionId" | "type">> = {},
    options: TrackOptions = {}
): void {
    // 1. Build event object with anonId, sessionId, path, attribution
    // 2. Dedup check (in-memory set, 1.5s window)
    // 3. Fan out to GA4, Meta Pixel, Clarity (skip for internal paths)
    // 4. POST to /api/track (Firestore sink) — always last
}
```

**Step 3 — Selective Meta forwarding**

Not every event should go to Meta. Define a `FORWARD_TO_META` array with only the semantically meaningful events:

```typescript
const FORWARD_TO_META: SiteEventType[] = [
    "cta_click",
    "video_started",
    "video_completed",
    "quiz_started",
    "quiz_completed",
    "qualifying_completed",
    "whatsapp_button_click",
];
```

**Step 4 — GA4 event name mapping**

Map internal event types to GA4 standard names where possible for better reporting:

```typescript
const GA4_EVENT_NAME_MAP: Partial<Record<SiteEventType, string>> = {
    page_view: "page_view",
    video_started: "video_start",
    video_completed: "video_complete",
    form_submitted: "form_submit",
    quiz_completed: "quiz_completed",
    // ... etc
};
```

**Step 5 — Clarity session tagging**

Tag Clarity sessions with the last event type and target so heatmaps can be filtered:

```typescript
window.clarity("set", "lastEvent", event.type);
if (event.target) window.clarity("set", "lastTarget", event.target);
if (event.leadId) window.clarity("set", "leadId", event.leadId);
```

### Key Files (Reference Implementation)

- `apps/web/src/lib/analytics/track.ts` — Full tracker with all 4 sinks
- `apps/web/src/types/events.ts` — `SiteEventType` union and `SiteEvent` interface

---

## Channel 2: Server-Side CAPI

### What It Does

Sends events directly from the server (Next.js API route or server action) to the Meta Conversions API, bypassing the browser entirely. This catches the ~30-40% of events that ad blockers suppress.

### How to Implement

**Step 1 — Create the server action**

Create `lib/actions/track-meta-event.ts` as a `"use server"` module:

```typescript
"use server";
import crypto from "crypto";

export async function trackMetaEvent(eventData: {
    eventName: string;
    userData: {
        email?: string;       // SHA-256 hashed before sending
        phone?: string;       // SHA-256 hashed, digits only
        externalId?: string;  // SHA-256 hashed
        fbp?: string | null;  // _fbp cookie (for dedup)
        fbc?: string | null;  // _fbc cookie (for dedup)
        clientIpAddress?: string | null;
        clientUserAgent?: string | null;
    };
    customData?: Record<string, any>;
    eventSourceUrl: string;
    eventId?: string;         // Must match client-side eventId for dedup
}) { ... }
```

**Step 2 — Hash PII before sending**

Meta requires PII to be SHA-256 hashed and lowercased:

```typescript
function hashData(data: string) {
    return crypto.createHash("sha256")
        .update(data.trim().toLowerCase())
        .digest("hex");
}
```

**Step 3 — Configure environment variables**

| Env Var | Purpose | Where to Get It |
|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Pixel ID | Meta Events Manager > Data Sources |
| `META_ACCESS_TOKEN` | System user token | Meta Business Settings > System Users |
| `META_GRAPH_API_VERSION` | API version (default `v25.0`) | Meta Graph API docs |
| `META_TEST_EVENT_CODE` | Test mode code (optional) | Events Manager > Test Events tab |

**Step 4 — Fire CAPI from API routes**

Call `trackMetaEvent()` from server-side code (API routes, webhook handlers) when significant events occur:

```typescript
// In /api/quiz-complete/route.ts
await trackMetaEvent({
    eventName: 'Lead',
    userData: { email, phone, externalId: leadId, fbp, fbc, clientIpAddress, clientUserAgent },
    customData: { content_name: 'Quiz', quiz_profile: profile },
    eventSourceUrl: `${baseUrl}/quiz`,
    eventId: leadId,
});
```

**Step 5 — Dedup with client pixel**

Use the same `eventId` for both client-side `fbq()` and server-side CAPI calls. Meta deduplicates events with matching `event_id` values.

### Key Files (Reference Implementation)

- `apps/web/src/lib/actions/track-meta-event.ts` — CAPI server action
- `apps/web/src/lib/tracking/lead-attribution.ts` — Builds tracking context from request headers + cookies

---

## Channel 3: URL-Based PageView

### What It Does

Appends query parameters to the URL before firing a standard `fbq('track', 'PageView')`. Meta Events Manager custom conversions match on URL patterns, turning any page load into a trackable conversion.

### How to Implement

**Step 1 — Append conversion parameters to URL**

On the results/confirmation page, add query params that encode the conversion:

```typescript
// After qualifying tier is computed
const url = new URL(window.location.href);
url.searchParams.set('qualified', tier); // "high", "medium", or "low"
window.history.replaceState(null, '', url.toString());

// Fire a fresh PageView so Meta picks up the new URL
window.fbq('track', 'PageView');
```

**Step 2 — Create custom conversions in Meta Events Manager**

In Events Manager > Custom Conversions, create rules that match URL patterns:

| Conversion Name | Event | URL Rule | Purpose |
|---|---|---|---|
| Quiz Lead | All URL traffic | URL contains `/results` | Tracks quiz completions |
| Qualified Lead | All URL traffic | URL contains `qualified=` | Tracks qualifying completions |
| Checkout Started | All URL traffic | URL contains `/checkout` | Tracks checkout starts |
| Program Purchase | All URL traffic | URL contains `/thank-you` | Tracks purchases |

**Step 3 — Optimize ad campaigns on custom conversions**

In Meta Ads Manager, switch campaign optimization objective from lower-funnel events (Quiz Lead) to higher-value events (Qualified Lead, Purchase) as data accumulates. This teaches Meta's algorithm to find higher-intent users.

---

## Firestore Event Sink (Internal Data Warehouse)

### What It Does

Every event from Channel 1 is also POSTed to `/api/track`, which writes it to the `siteEvents` Firestore collection. This becomes the internal data warehouse powering the insights dashboard.

### How to Implement

**Step 1 — Create the API route**

Create `app/api/track/route.ts`:

```typescript
const VALID_EVENT_TYPES: SiteEventType[] = [
    "page_view", "page_exit", "cta_click", "video_started",
    // ... all registered event types
];

export async function POST(req: NextRequest) {
    // 1. Bot guard (reject crawlers by UA)
    // 2. Parse and validate event payload
    // 3. Check event type against VALID_EVENT_TYPES allowlist
    // 4. Rate limit: 60 events/min per anonId
    // 5. Sanitize field sizes (path < 512, props < 4KB)
    // 6. Write to Firestore siteEvents collection with server timestamp
}
```

**Step 2 — Support both fetch and sendBeacon**

The tracker uses `fetch()` for normal events and `navigator.sendBeacon()` for page exit events (which fire during page unload). The API route must accept both:

```typescript
// Client side
if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(event)], { type: "application/json" });
    navigator.sendBeacon("/api/track", blob);
}
```

---

## Identity & Session Management

### Anonymous ID

Cookie-based UUID (`tsg_anon` or `{project}_anon`), persists 365 days:

```typescript
export function getAnonId(): string {
    let id = readCookie(ANON_COOKIE);
    if (!id) {
        id = crypto.randomUUID();
        writeCookie(ANON_COOKIE, id, 365);
    }
    return id;
}
```

### Session ID

sessionStorage-based UUID, resets after 30 minutes of inactivity (matches GA4 default):

```typescript
export function getSessionId(): string {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(SESSION_LAST_ACTIVE_KEY) || 0);
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id || (last && now - last > SESSION_IDLE_MS)) {
        id = crypto.randomUUID();
        sessionStorage.setItem(SESSION_KEY, id);
    }
    sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(now));
    return id;
}
```

### Lead ID Stitching

The `anonId` cookie is captured during quiz completion (`/api/quiz-complete`) and stored on the lead document. A Cloud Function then backfills `leadId` onto all historical `siteEvents` matching that `anonId`, linking anonymous browsing behavior to identified leads.

---

## UTM Persistence

### First-Touch + Last-Touch

Attribution is captured from URL parameters on every event:

```typescript
function readAttributionFromUrl(): SiteEventAttribution | undefined {
    const params = new URLSearchParams(window.location.search);
    return {
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
        utmContent: params.get("utm_content"),
        fbclid: params.get("fbclid"),
        gclid: params.get("gclid"),
        referrer: document.referrer,
    };
}
```

The `buildLeadTrackingContext()` helper in `lib/tracking/lead-attribution.ts` merges first-touch (stored on lead creation) and last-touch (from current request) attribution data.

---

## Event Type Registry

### Current Types (20)

```typescript
export type SiteEventType =
    | "page_view"              // Page loaded
    | "page_exit"              // Page unloaded (with dwell time)
    | "cta_click"              // Any CTA button clicked
    | "video_started"          // Video play initiated
    | "video_progress"         // Video milestone (25/50/75/100%)
    | "video_completed"        // Video finished
    | "video_paused"           // Video paused
    | "scroll_depth"           // Scroll milestone (25/50/75/100%)
    | "form_started"           // Form first interaction
    | "form_field_focused"     // Individual field focused
    | "form_submitted"         // Form submitted
    | "form_abandoned"         // Form started but not submitted
    | "quiz_started"           // Quiz first question viewed
    | "quiz_question_answered" // Individual quiz answer
    | "quiz_completed"         // Quiz finished
    | "quiz_abandoned"         // Quiz started but not finished
    | "external_link_click"    // Outbound link clicked
    | "whatsapp_button_click"  // WhatsApp CTA clicked
    | "accordion_toggle"       // FAQ/accordion opened
    | "qualifying_completed";  // Qualifying tier computed
```

---

## Adding a New Event Type (Step-by-Step)

When adding a new tracking event (e.g., `checkout_abandoned`):

### Step 1 — Add to the type union

**File:** `apps/web/src/types/events.ts`

Add the new type to `SiteEventType`:

```typescript
export type SiteEventType =
    | "page_view"
    // ... existing types ...
    | "checkout_abandoned";    // NEW
```

### Step 2 — Add to the API allowlist

**File:** `apps/web/src/app/api/track/route.ts`

Add to `VALID_EVENT_TYPES` array:

```typescript
const VALID_EVENT_TYPES: SiteEventType[] = [
    // ... existing types ...
    "checkout_abandoned",
];
```

### Step 3 — Decide on Meta forwarding

**File:** `apps/web/src/lib/analytics/track.ts`

If the event should fire to Meta Pixel, add it to `FORWARD_TO_META`:

```typescript
const FORWARD_TO_META: SiteEventType[] = [
    // ... existing types ...
    "checkout_abandoned",  // Only add if semantically valuable for Meta
];
```

### Step 4 — Add GA4 name mapping (optional)

**File:** `apps/web/src/lib/analytics/track.ts`

If GA4 has a standard event name for this action:

```typescript
const GA4_EVENT_NAME_MAP: Partial<Record<SiteEventType, string>> = {
    // ... existing mappings ...
    checkout_abandoned: "checkout_abandon",
};
```

### Step 5 — Create convenience helper

**File:** `apps/web/src/lib/analytics/track.ts`

Add a typed helper function:

```typescript
export function trackCheckoutAbandoned(product: string, step: string): void {
    track("checkout_abandoned", {
        target: `checkout_${product}`,
        props: { product, step },
    });
}
```

### Step 6 — Add server-side CAPI (if needed)

If this event should also fire server-side (for high-value conversions), add a `trackMetaEvent()` call in the relevant API route.

### Step 7 — Add URL-based custom conversion (if needed)

If this event maps to a page URL, create a custom conversion in Meta Events Manager matching the URL pattern.

---

## Deduplication

### Client-Side Dedup

In-memory set of last 8 events with 1.5s window prevents React strict-mode double-fires and accidental re-renders:

```typescript
const key = `${type}:${event.target || ""}:${event.path}`;
if (recentEventCache.has(key)) return;
recentEventCache.add(key);
setTimeout(() => recentEventCache.delete(key), 1500);
```

### Server-Side Dedup (API Route)

Rate limited to 60 events per minute per `anonId` using an in-process bucket map.

### Cross-Channel Dedup (Meta)

Client-side `fbq()` and server-side CAPI events use the same `eventId` so Meta deduplicates them automatically.

---

## Verification Checklist

After implementing the tracking system:

- [ ] Meta Pixel fires on page load (check with Meta Pixel Helper browser extension)
- [ ] GA4 realtime report shows events
- [ ] Clarity recordings capture tagged sessions
- [ ] `/api/track` writes events to Firestore `siteEvents` collection
- [ ] CAPI events appear in Meta Events Manager > Test Events (with `META_TEST_EVENT_CODE` set)
- [ ] URL-based custom conversions match in Events Manager > Custom Conversions
- [ ] AnonId cookie persists across page reloads
- [ ] Session ID resets after 30 min idle
- [ ] Bot UAs are filtered at the API route
- [ ] Rate limiting prevents runaway event loops
