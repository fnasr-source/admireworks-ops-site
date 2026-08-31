# Project Launch — Integrations Page

Most projects need to connect to Meta Ads, WhatsApp Business, Google Ads, Resend, and at least one of Shopify / WooCommerce / Stripe. The integrations page is where those connections live — credential forms, sync status, connection history. Every project copies the same structure.

## What It Looks Like

A single `/admin/integrations` page listing each external platform as a card. Each card shows:

1. **Platform name + logo**
2. **Status pill** — Live / Stale / Error / Not Synced
3. **Last sync timestamp** + time zone
4. **Credential form** — click to expand, shows fields + step-by-step setup instructions
5. **Connection history** — recent sync attempts with success/failure

The user chose to **document only**, not duplicate. So this workflow explains the pattern; the real implementation lives in `Admireworks Internal OS/apps/client-portal/src/app/dashboard/integrations/`.

## The Six Standard Platforms

### Meta Ads (Pixel + CAPI)

Fields: Pixel ID, CAPI Access Token, Test Event Code (dev). Setup: Meta Business Manager → Events Manager → the pixel → Settings. Sync check: fire a test event, see it in Events Manager within 10 seconds.

### Google Ads

Fields: MCC ID, OAuth access (via Google OAuth consent). Setup: Google Ads account → Tools → API Center → generate developer token. Sync: pull campaign list.

### TikTok Ads

Fields: Pixel ID, Access Token. Setup: TikTok Ads Manager → Events → Pixel → Shopify app or manual. Same pattern as Meta.

### Shopify OR WooCommerce

**Only one per project** — pick based on the client's actual store.

- Shopify: custom app with Admin API token. Setup in Shopify admin → Apps → Develop apps.
- WooCommerce: REST API keys. Setup in WP admin → WooCommerce → Settings → Advanced → REST API.

### Google Analytics 4

Fields: Measurement ID (G-XXXX), API Secret. Setup: GA4 → Admin → Data Streams → Measurement Protocol API secrets.

### WhatsApp Business

Fields: Phone Number ID, Business Account ID, Access Token, Webhook Verify Token, Webhook HMAC Secret. Setup: Meta Business Suite → WhatsApp → API Setup.

**Webhook security:** always verify HMAC on incoming webhooks. See `Basseqat/src/app/api/webhooks/whatsapp/route.ts` for the canonical check.

## Data Model

### Firestore collection: `integrations`

One doc per platform, doc ID = platform key:

```ts
{
  id: 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'shopify' | 'woocommerce' | 'ga4' | 'whatsapp';
  status: 'live' | 'stale' | 'error' | 'not_synced';
  lastSyncAt: Timestamp | null;
  lastSyncError?: string;
  config: { /* per-platform credential fields */ };
  timezone: string;
  currency: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Never store credentials in plain text if they're rotatable — store a reference to a GSM secret name and read at sync time.

### Sync history subcollection

`integrations/{platform}/syncs/{syncId}` — one doc per sync attempt with timestamp, result, error, items_pulled.

## Save Flow

### Unified save endpoint

`POST /api/integrations/[platform]/save` — validates, writes to Firestore, triggers a test sync, updates status. One route handler per platform, all sharing a `validateAndSave()` helper.

Reference the Basseqat "round 4a" unification work (April 15 2026) — it consolidated per-platform save logic into one helper.

### Test connection button

Each card has a "Test connection" button that fires a lightweight API call (e.g., Meta: fetch the pixel's recent events). Results in a toast. If it fails, the status pill flips to `error` with the error message.

## Webhook Pattern

### WhatsApp webhook (the complex one)

`POST /api/webhooks/whatsapp` must:

1. Verify HMAC signature (`x-hub-signature-256` header, HMAC-SHA256 of body with `WHATSAPP_WEBHOOK_HMAC_SECRET`)
2. Parse the incoming message or status event
3. Write to Firestore `whatsappEvents` collection
4. Respond 200 fast (Meta retries if >5s)

Any longer processing (routing to sequences, notifying team) goes in a separate worker, not inline.

Reference: `Basseqat/src/app/api/webhooks/whatsapp/route.ts`.

## Admin UI

### Integrations page layout

- Page header: "Integrations"
- Grid of platform cards (3 per row on desktop, 1 on mobile)
- Per-card: expand to reveal credential form
- Below grid: recent sync activity feed

Components used (from workflow 02): `AdminPageShell`, `AdminPageHeader`, `StatCard`, `Badge`, `Button`, `Input`, `AdminStateCard`.

## What NOT To Do

- **Don't inline secrets in the config doc.** Use GSM secret names.
- **Don't skip HMAC on webhooks.** Meta will deliver messages even if someone spoofs your endpoint.
- **Don't poll for sync status.** Use Firestore listeners on the integration doc so status updates are real-time.
- **Don't build 6 separate pages.** One page with 6 cards. Users shouldn't navigate between platforms.

## Source of truth

- Full implementation: `Admireworks Internal OS/apps/client-portal/src/app/dashboard/integrations/`
- WhatsApp webhook HMAC check: `Basseqat/src/app/api/webhooks/whatsapp/route.ts`
- Unified save flow (Basseqat round 4d): `Basseqat/src/app/admin/integrations/page.tsx`
- Alternative layout reference: `Edrak Space/apps/web/src/app/admin/settings/integrations/`
