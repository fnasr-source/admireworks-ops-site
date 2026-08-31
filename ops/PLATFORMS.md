# Platforms & Tools

Central catalog of all platforms Admireworks uses, what they're for, and where credentials live.
AI assistants should check this file before asking for tool, API, or credential information.

---

## Internal Infrastructure

| Platform | Purpose | Credential / Config Location |
|---|---|---|
| **Firebase** (admireworks---internal-os) | Firestore DB, Auth, Storage, App Hosting | `firebase/service-account.json` (admin) · `.env.local` (client SDK) |
| **GitHub** (admireworks-internal-os) | Version control, CI/CD, App Hosting trigger | SSH / HTTPS — configured per machine |
| **Doppler** | Secret management — syncs all env vars across devices and team members | CLI: `doppler login` · Project: `admireworks-internal-os` · Setup guide: `docs/DOPPLER-SETUP.md` |

---

## Client-Facing & Billing

| Platform | Purpose | Credential Location |
|---|---|---|
| **Stripe** | Card payments, payment links, subscriptions | `apps/client-portal/.env.local` — `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Resend** | Transactional email (invoices, receipts, onboarding) | `apps/client-portal/.env.local` — `RESEND_API_KEY`, `RESEND_FROM_EMAIL=hello@admireworks.com` |
| **InstaPay** | Egyptian bank-transfer payments | Manual — reference number captured in portal |

---

## Research & Outreach

| Platform | Purpose | Credential Location |
|---|---|---|
| **Apollo.io** | Lead research, enrichment, contact data | `.env` — `APOLLO_API_KEY` |
| **Web Search / Perplexity** | Market research, competitor scans | Session-based — no stored key required |

---

## Project & Client Management

| Platform | Purpose | Credential Location |
|---|---|---|
| **Asana** | Task and project management, one Asana board per client | Google Cloud Secret Manager (`admireworks---internal-os` project), secret `ASANA_PAT_AW` (canonical, verified 2026-07-26). Local cache: `~/.admireworks/asana.env`, refreshed via `scripts/sync-asana-secret.mjs`. Needed for writes the Asana MCP itself cannot do, notably adding/removing tags on a task (used by `check-client-issues` for the In Progress tag lifecycle). |
| **Google Drive** | Client file storage — one folder per client | Not yet configured — service account needed |
| **my.admireworks.com** | The client portal — billing, artifacts, approvals, reporting | Firebase Auth — no separate credential |

---

## Advertising Platforms (Per-Client)

These are connected per-client via the portal's **Platform Connections** module. Credentials are stored in Firestore under `platformConnections/{clientId}` — not in `.env`.

| Platform | What it tracks |
|---|---|
| Meta Ads | Spend, impressions, clicks, conversions |
| Google Ads | Spend, clicks, conversions |
| TikTok Ads | Spend, reach, clicks |
| GA4 | Sessions, revenue, events |
| Shopify | Orders, revenue, AOV |
| WooCommerce | Orders, revenue |

### Meta: multi-Business-Manager system-user tokens (added 2026-07-03, task 2.6)

Agency-side Meta access does NOT live in `platformConnections`; it is N system-user tokens,
one per Business Manager:

- `META_SYSTEM_USER_TOKEN` (Secret Manager + `apps/client-portal/.env.local`): the AW Main BM
  token, covers all AW-managed accounts.
- `META_SYSTEM_USER_TOKEN_<SUFFIX>`: one per additional BM (today: `_30YRS` for the 30yrs BM
  that owns MHK and co-owns Komu Lale).
- Routing: `apps/client-portal/src/lib/ad-platforms/meta/token-router.ts` (+`token-registry.ts`)
  tries per-account tokens with permission fall-through, caches the winner, and honors a manual
  override at Firestore `systemConfig/metaTokenRouting.overrides`.

**Add a new BM (no code changes):**
1. Create the system user in the new BM, grant it the ad accounts + pages, mint a token.
2. Store it in Secret Manager as `META_SYSTEM_USER_TOKEN_<SUFFIX>` (never echo it on the CLI).
3. Add the variable/secret pair to `apps/client-portal/apphosting.yaml` and redeploy the portal.
4. Local stdio MCP sessions won't reload env mid-session; restart the session to pick it up.

### Meta: capability-grant procedure for app-restricted assets (added 2026-07-04, task 4.5)

Rare, but confirmed twice on OTN Textiles: some SPECIFIC creative assets reject every API
write with error `(#3) Application does not have the capability to make this API call.`
regardless of field shape, because the asset was originally uploaded through a different
app context and the AW system-user app's write permission never extended to it. Full
procedure, the exact error signature, and the append-only restricted-creative registry
live in `docs/PROGRAMMATIC-AD-OPS/CAPABILITY-MATRIX.md` (Part C, "Meta capability-grant
procedure"), this is only the click-path for the fix an AW human performs:

1. business.facebook.com, the Business Manager that owns the affected ad account (use the
   multi-BM table above to find which BM that is).
2. Settings, Users, System Users, select the AW system user for that BM.
3. Assign Assets, Ad Accounts, select the account, toggle **Full Control**.

This requires Business Manager admin access; it is an account-administration action, not
an API call, so it cannot be done from the aw-ads MCP or any script.

### Google Ads: org-wide MCC credentials

All Google Ads work runs through the AW MCC `885-975-9478` with ONE org-wide OAuth credential
set in Secret Manager: `GOOGLE_ADS_{DEVELOPER_TOKEN,CLIENT_ID,CLIENT_SECRET,REFRESH_TOKEN}_AW`
(project `admireworks---internal-os`). Local cache `~/.admireworks/google-ads.env`, regenerated
via `scripts/sync-google-ads-secrets.mjs`. Bootstrap doc: `scripts/bootstrap-google-ads-secrets.md`.

Capability limits + per-client account registry: `docs/PROGRAMMATIC-AD-OPS/CAPABILITY-MATRIX.md`
and `.claude/skills/client-data-sources/SKILL.md` (live-verified snapshot in
`docs/PROGRAMMATIC-AD-OPS/BASELINE.md`).

---

## Communications

| Platform | Purpose | Notes |
|---|---|---|
| **WhatsApp** (Systeme.io / manual) | Client and lead nurture sequences | Templates managed per campaign |
| **Gmail** | Finance inbox parsing for expenses | Connected via Finance Inbox module in portal |
| **Google Calendar** | Meeting scheduling | Connected via Scheduling module in portal |
| **Google Meet** | Video calls | Auto-generated via Google Calendar |

---

## Content & Design Tools

| Platform | Purpose |
|---|---|
| Puppeteer | PDF generation for proposals and invoices (`ops/proposal-playbook/scripts/generate-proposal-pdf.js`) |
| HTML/CSS | Proposal and invoice rendering (inline A4 layout) |

---

## CI/CD & Deployment

| System | What It Does |
|---|---|
| **Firebase App Hosting** | Client portal (`my.admireworks.com`) auto-deploys on push to `main` — no manual deploy needed |
| **GitHub Actions — `deploy.yml`** | Runs on every push to `main` + manual dispatch. Steps: TypeScript check → Firestore rules + indexes deploy → summary |
| **GitHub Actions — `deploy-campaigns.yml`** | Deploys campaign sites (e.g. `lup-2026`) when files in `campaigns/*/public/` change |
| **GitHub Pages** | Static dashboards and presentations deploy to `ops.admireworks.com` |

### How Deployment Works

1. You push to `main` (or open a PR that merges to `main`)
2. GitHub Actions runs `deploy.yml`:
   - **Job 1:** TypeScript check (`npx tsc --noEmit` in `apps/client-portal/`)
   - **Job 2:** Deploys Firestore rules + indexes using `FIREBASE_SERVICE_ACCOUNT` secret
   - **Job 3:** Summary — App Hosting rollout triggered automatically via Firebase ↔ GitHub integration
3. No one needs the service account locally — it lives in **GitHub → Settings → Secrets** as `FIREBASE_SERVICE_ACCOUNT`

### GitHub Secrets

| Secret | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account used by GitHub Actions to deploy Firestore rules and campaign sites |

### For New Projects Using This Pattern

1. Create a Firebase service account in [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Download the JSON key
3. Add it as a GitHub secret named `FIREBASE_SERVICE_ACCOUNT` in the repo's Settings → Secrets
4. Copy the `deploy.yml` workflow and adjust the project ID
5. Team members just push to `main` — everything deploys automatically

---

## How to Add a New Platform

1. Add the credential to the appropriate `.env` file
2. Add a row to this file under the correct category
3. Reference `ops/PLATFORMS.md` from `AGENTS.md` so AI assistants auto-discover it

---

## Credential Security Rules

- **Never commit `.env` or `.env.local`** — both are in `.gitignore`
- **Firebase service account** lives at `firebase/service-account.json` — never committed
- **Client platform credentials** (Meta, Google Ads, etc.) are stored in Firestore encrypted fields, not in this repo
- **Rotate keys** in the portal's Settings → Integrations before retiring them
