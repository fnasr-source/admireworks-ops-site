# Multi-Tenant Abstraction & New Client Deployment Checklist

This document provides a reusable checklist for deploying the direct-response system for a new client. It is based on the abstraction points documented in The Slim Game's `Docs/architecture/multi-tenant-abstractions.md` and generalized for any client project.

---

## 1. Infrastructure Configuration

### Firebase Project

- [ ] Create a new Firebase project in the Firebase console
- [ ] Enable Firestore (production mode, choose region closest to the client's audience)
- [ ] Enable Firebase Auth (Google OAuth + Email/Password)
- [ ] Enable Firebase Storage (for brand assets and uploads)

### App Hosting

- [ ] Create App Hosting backend: `firebase apphosting:backends:create <backend-name> --project <project-id>`
- [ ] Connect to the GitHub repo and set the production branch
- [ ] Configure environment variables in App Hosting (all `NEXT_PUBLIC_FIREBASE_*` vars)
- [ ] Verify auto-deploy triggers on push to the production branch

### Cloud Functions Region

- [ ] Decide on function region (default: `europe-west1` for MENA clients)
- [ ] Search-replace the region string across all function exports in `firebase/functions/src/`

### GitHub Repository

- [ ] Create repo under the `fnasr-source` organization
- [ ] Set the default branch (`main` for most projects, `master` for Edrak-style projects)
- [ ] Add GitHub Actions workflows: TypeScript check, Firestore rules/indexes deploy
- [ ] Add the service account JSON as a GitHub secret (`FIREBASE_SA` or equivalent)
- [ ] Register the project in the monitoring table in CLAUDE.md

---

## 2. Firestore appConfig Documents

All runtime credentials and tuning live in Firestore under `appConfig/`. These can be changed without redeploying.

### `appConfig/integrations`

| Field Path | Purpose | Where to Get It |
|---|---|---|
| `meta.accessToken` | Meta Ads API access token | Meta Business Suite > Events Manager |
| `meta.adAccountId` | Meta Ads ad account ID | Meta Business Suite |
| `google.propertyId` | GA4 Data API property ID | GA4 Admin > Property Settings |
| `google.credentialsJson` | GA4 service account JSON (stringified) | GCP IAM console |
| `resend.apiKey` | Resend email API key | Resend dashboard |
| `telegram.botToken` | Telegram bot token for alerts | BotFather |
| `telegram.chatId` | Telegram chat ID for alerts | Telegram group settings |
| `whatsapp.apiToken` | WhatsApp Cloud API token | Meta Business Suite > WhatsApp |
| `whatsapp.phoneNumberId` | WhatsApp phone number ID | Meta Business Suite > WhatsApp |
| `systeme.apiKey` | Systeme.io API key (if used) | Systeme.io settings |

### `appConfig/aiReply`

| Field | Purpose | Default |
|---|---|---|
| `systemPrompt` | AI sales assistant persona and instructions | Client-specific |
| `model` | Gemini model ID | `gemini-1.5-flash` |
| `temperature` | Response creativity (0-1) | `0.7` |
| `maxOutputTokens` | Max reply length | `500` |
| `escalationKeywords` | Phrases that trigger human handoff | Client-specific |
| `enabled` | Master switch for AI replies | `false` (enable after QA) |

### `appConfig/leadScoring`

| Field | Purpose |
|---|---|
| `weights.emailEngagement` | Score weight for email opens/clicks |
| `weights.sitePresence` | Score weight for time-on-site signals |
| `weights.quizCompletion` | Score weight for completing the quiz |
| `weights.qualifyingAnswers` | Score weight for qualifying question responses |
| `tiers.hot.threshold` | Minimum score to be classified as Hot |
| `tiers.warm.threshold` | Minimum score to be classified as Warm |

---

## 3. Source Code Configuration (Requires Code Change)

These items are hardcoded in the source and require a code change and deploy to update.

| Item | File | Notes |
|---|---|---|
| GA4 Measurement ID | `src/components/GoogleAnalytics.tsx` | `G-XXXXXXXX` format |
| Microsoft Clarity project ID | `src/components/Clarity.tsx` | Project hash from Clarity dashboard |
| Meta Pixel ID | `.env.local` (`NEXT_PUBLIC_FB_PIXEL_ID` or `NEXT_PUBLIC_META_PIXEL_ID`) | From Meta Events Manager |
| Quiz questions and scoring | `src/lib/quiz-data.ts` | All quiz steps, answers, segment mappings, qualifying scores |
| Brand name and product names | Layout components, metadata, SEO tags | Search-replace across the app |
| Default follow-up sequences | `src/lib/crm/follow-up-engine.ts` | Default sequences injected on first run |
| Firebase config object | `.env.local` | All `NEXT_PUBLIC_FIREBASE_*` values |

---

## 4. Brand Asset Replacement

All brand assets live under `apps/web/public/brand/` (or `public/` root in some projects).

### Required Assets

- [ ] `logo.svg` / `logo.png` -- Primary logo
- [ ] `logo-dark.svg` -- Dark mode variant
- [ ] `favicon.ico` -- Browser tab icon (32x32 and 16x16)
- [ ] `apple-touch-icon.png` -- iOS home screen icon (180x180)
- [ ] `og-image.jpg` -- Open Graph image for social sharing (1200x630)
- [ ] Product hero images for landing pages

### Font Setup

- [ ] Confirm the Arabic font stack works for the client's brand
- [ ] If custom fonts are required, add them via `next/font` and update `globals.css`
- [ ] Update the `--font-heading` and `--font-sans` tokens

### Color Setup

- [ ] Define the full token palette in `globals.css` (see `workflows/theme-system.md`)
- [ ] Create light mode tokens in `:root`
- [ ] Create dark mode tokens in `[data-theme="dark"]` if dark mode is needed
- [ ] Replace any product-specific color tokens

---

## 5. Sales SOP Customization

### WhatsApp Templates

- [ ] Define the initial greeting template for new leads
- [ ] Define the follow-up template for each qualifying tier (HIGH, MEDIUM, LOW)
- [ ] Define the appointment confirmation template
- [ ] Define the payment follow-up template
- [ ] Register all templates in the WhatsApp Business Manager for approval

### Email Templates

- [ ] Welcome/confirmation email after quiz or registration
- [ ] Nurture sequence for LOW tier leads (3-5 emails)
- [ ] Consultation reminder for HIGH/MEDIUM leads
- [ ] Post-purchase onboarding sequence
- [ ] Payment receipt and access delivery

### CTA Text

- [ ] Primary CTA text for landing pages (Egyptian Arabic or client language)
- [ ] WhatsApp button text
- [ ] Email CTA button text
- [ ] Quiz completion CTA
- [ ] Checkout CTA

### SOP Steps

- [ ] Update `ROUTINE_STEPS` in the admin SOP page (`src/app/admin/sop/page.tsx`)
- [ ] Define the daily sales routine cadence and responsibilities
- [ ] Document the escalation path for each lead tier

---

## 6. DNS & Domain Setup

### Custom Domain

- [ ] Register or transfer the client domain
- [ ] Point the domain to Firebase App Hosting via DNS
- [ ] Verify the custom domain in Firebase console
- [ ] Configure SSL (auto-provisioned by Firebase)

### Email Subdomains

| Subdomain | Purpose | Provider |
|---|---|---|
| `notify.{domain}` | Transactional emails (Resend) | Resend DNS verification |
| `mail.{domain}` | Marketing emails (if separate) | Email provider DNS |
| No subdomain | Main site | Firebase App Hosting |

- [ ] Add Resend DNS records (SPF, DKIM, DMARC) for the sending subdomain
- [ ] Verify the domain in the Resend dashboard
- [ ] Update the `FROM` address in email-sending code

### Tracking Domain (Optional)

- [ ] Set up a first-party tracking subdomain for CAPI if needed (e.g., `t.{domain}`)
- [ ] This helps bypass ad blockers for server-side event delivery

---

## 7. Verification Checklist

Run this after completing all the above steps:

### Infrastructure

- [ ] Firebase project is live and accessible
- [ ] App Hosting deploys successfully on push
- [ ] Firestore rules are deployed
- [ ] Cloud Functions deploy and execute

### Tracking

- [ ] GA4 receives real-time events
- [ ] Meta Pixel fires on page load
- [ ] Clarity records sessions
- [ ] Server-side CAPI delivers events
- [ ] UTM parameters persist through the funnel

### Funnel

- [ ] Quiz loads and all questions render correctly
- [ ] Email capture works and saves to Firestore
- [ ] Qualifying tier calculation produces correct results
- [ ] Tier routing sends to the right destination (WhatsApp or email)
- [ ] WhatsApp templates send successfully
- [ ] Email sequences trigger correctly

### Admin

- [ ] Admin login works (Google Auth)
- [ ] Lead list shows captured leads with correct tier badges
- [ ] WhatsApp inbox receives and displays messages
- [ ] AI reply queue processes (if enabled)
- [ ] SOP page reflects the client's workflow

---

## Reference

- **Source checklist:** The Slim Game `Docs/architecture/multi-tenant-abstractions.md`
- **Theme system:** `ops/direct-response-playbook/workflows/theme-system.md`
- **Tracking architecture:** `ops/direct-response-playbook/workflows/tracking-architecture.md`
- **Post-deployment QA:** `ops/direct-response-playbook/checklists/post-deployment-live-qa.md`
