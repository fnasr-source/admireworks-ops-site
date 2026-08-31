# Project Launch — Secrets Management

Secrets never touch the repo. The chain is **Doppler → Google Secret Manager → App Hosting env** for production, **Doppler → `doppler run`** for local dev. By the end of this workflow a new engineer can clone the repo, run `doppler setup`, and `npm run dev` boots with real secrets.

## Categories

Secrets fall into three categories. Handle each differently:

- **Public Firebase config** (`NEXT_PUBLIC_FIREBASE_*`) — not secret, commit as `value:` in `apphosting.yaml`.
- **Server secrets** (Stripe keys, Resend key, Meta CAPI tokens, webhook secrets) — Doppler + GSM + App Hosting secret binding.
- **Service account JSON** — never in Doppler, never committed. Local file path only.

## Doppler Setup

### Create the Doppler project

Doppler dashboard → New Project → name: `<project-name>`. Create three configs: `dev`, `stg`, `prd`.

### Add secrets to `dev` config

Add every server secret the app needs. Copy from an existing project's Doppler as a starting template — common keys:

- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_WEBHOOK_HMAC_SECRET`
- `FIREBASE_SERVICE_ACCOUNT_PATH` (local file path)
- App-specific: admin API keys, cron tokens

### Promote `dev` → `stg` → `prd`

Once `dev` works, copy values to `stg` and `prd`. Production values may differ (live Stripe keys, live Meta tokens) — keep test values in `dev`.

### Local `doppler setup`

```bash
doppler login
cd <project-dir>
doppler setup         # interactive: pick project + dev config
```

Run the dev server via Doppler:

```bash
doppler run -- npm run dev
```

Add this to the project README so every engineer sees it.

## Google Secret Manager

### Enable the API

In the Firebase/GCP project: APIs & Services → enable "Secret Manager API".

### Sync Doppler → GSM

Doppler supports a native GCP integration. In Doppler: Integrations → Google Cloud Secret Manager → connect → pick the GCP project → select the `prd` config → sync.

This creates one GSM secret per Doppler variable, prefixed with the Doppler project name. Re-syncs automatically when Doppler values change.

### Grant App Hosting access

App Hosting backends need `roles/secretmanager.secretAccessor` on each secret. Run once per secret, or at the project level for simplicity:

```bash
gcloud projects add-iam-policy-binding <project-id> \
  --member="serviceAccount:service-<project-number>@gcp-sa-firebaseapphosting.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## App Hosting Binding

### Declare secrets in `apphosting.yaml`

```yaml
env:
  - variable: RESEND_API_KEY
    secret: RESEND_API_KEY
  - variable: STRIPE_SECRET_KEY
    secret: STRIPE_SECRET_KEY
  # ... one entry per secret
```

The `secret:` name must match the GSM secret name exactly (case-sensitive).

### Trigger a rollout

Push to `main` or click "Save and deploy" in the console. New env vars are injected at the next build. Verify via App Hosting backend → Environment → Secrets tab.

## Rotation

### Document rotation per secret

In `docs/SECRETS.md`, list every secret with:
- What it is
- Where it comes from (Stripe dashboard → Developers → API keys, etc.)
- Who can rotate it
- What breaks if rotated without coordination

Template: `Basseqat/docs/SECRETS.md`.

### Rotation workflow

1. Generate new value in the vendor dashboard
2. Update in Doppler `prd` config
3. Wait for GSM sync (usually <1 min)
4. Trigger App Hosting rollout
5. Revoke old value in vendor dashboard

Never update GSM directly — it will desync with Doppler on the next sync and silently revert.

## Source of truth

- Reference doc: `Basseqat/docs/SECRETS.md`
- Same pattern (identical format): `The Slim Game/docs/SECRETS.md`
- apphosting.yaml secret binding example: `Basseqat/apphosting.yaml`
- Service-account paths table: `/Users/user/.claude/CLAUDE.md` → "Known Projects" table
