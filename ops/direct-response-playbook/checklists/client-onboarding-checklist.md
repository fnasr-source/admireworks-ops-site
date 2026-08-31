# Client Onboarding Checklist

**Purpose:** Run this checklist for every new client after proposal acceptance. Adapt per client based on project scope.

**Usage:**
1. Copy this checklist into the client's `active_state/` folder
2. Customize items based on the client's specific project scope
3. Create corresponding tasks in the portal for client and team items
4. Track completion in both the checklist and the portal tasks

---

## 1. Access & Credentials (Client Provides)

| # | Item | Required For | Priority |
|---|------|-------------|----------|
| 1.1 | Meta Business Manager access | Ad campaigns, pixels, audiences | High |
| 1.2 | WhatsApp Business API setup | Automated messaging, follow-up sequences | High |
| 1.3 | Google Analytics property access | Landing page tracking, conversion measurement | Medium |
| 1.4 | Google Tag Manager access | Tag deployment, event tracking | Medium |
| 1.5 | Google Ads account access | Search ad campaigns | Medium |
| 1.6 | Domain/subdomain decision | Landing page hosting | High |
| 1.7 | DNS access or record application | Subdomain pointing, SSL | High |
| 1.8 | Brand guidelines (logo, colors, fonts) | All marketing materials | High |
| 1.9 | Payment integration credentials | Online transactions (if applicable) | Medium |
| 1.10 | Social media account credentials | Content publishing (if in scope) | Low |
| 1.11 | Email domain authentication | Email sending (SPF, DKIM, DMARC) | Medium |

## 2. Technical Setup (Admireworks Configures)

| # | Item | Depends On | Priority |
|---|------|-----------|----------|
| 2.1 | Meta Pixel installation | 1.1 Meta access | High |
| 2.2 | GTM container setup | 1.4 GTM access | Medium |
| 2.3 | Conversion tracking (Google + Meta) | 2.1, 2.2 | Medium |
| 2.4 | WhatsApp API webhook configuration | 1.2 WA API setup | High |
| 2.5 | Domain/SSL for landing pages | 1.6, 1.7 Domain + DNS | High |
| 2.6 | Email sending infrastructure | 1.11 Email domain | Medium |
| 2.7 | UTM tracking structure documentation | None | Low |
| 2.8 | Portal client account provisioned | None | High |
| 2.9 | Funnel automation configured | 2.4, 2.5 | High |

## 3. Content & Creative Prerequisites

| # | Item | Source | Priority |
|---|------|--------|----------|
| 3.1 | Testimonials / social proof collected | Client + existing content | High |
| 3.2 | Product/service photos or screenshots | Client | Medium |
| 3.3 | Competitor analysis documented | Research phase | High |
| 3.4 | Customer avatar and segmentation | Strategy phase | High |
| 3.5 | Offer architecture defined | Strategy phase | High |
| 3.6 | Messaging bible / StoryBrand | Strategy phase | High |

## 4. Operational Setup

| # | Item | Owner | Priority |
|---|------|-------|----------|
| 4.1 | Lead handling workflow defined | Both | High |
| 4.2 | Message response SLAs set | Both | Medium |
| 4.3 | Admin team roles assigned | Client | Medium |
| 4.4 | Escalation procedures documented | Both | Medium |
| 4.5 | Reporting cadence agreed | Both | Medium |

## 5. Payment Integration

| # | Item | Required For | Priority |
|---|------|-------------|----------|
| 5.1 | PayMob merchant account credentials (Secret Key, Public Key, HMAC, Integration IDs) | Egypt payments | High |
| 5.2 | PayMob dashboard access for credential verification | Egypt payments | High |
| 5.3 | PayMob integration path confirmed (Unified Checkout vs hosted product links) | Checkout flow | High |
| 5.4 | Stripe account credentials (Secret Key, Publishable Key) | International payments | High |
| 5.5 | Stripe webhook endpoint configured and secret stored | Payment confirmation | High |
| 5.6 | Payment webhook URLs registered with both providers | Automated processing | High |

## 6. Email System

| # | Item | Required For | Priority |
|---|------|-------------|----------|
| 6.1 | Resend API key generated and stored in Doppler | Email sending | High |
| 6.2 | Transactional subdomain DNS records added (`notify.clientdomain.com`) | Purchase confirmations, alerts | High |
| 6.3 | Marketing subdomain DNS records added (`mail.clientdomain.com`) | Sequences, nurture flows | High |
| 6.4 | SPF, DKIM, DMARC verified for both subdomains | Deliverability | High |
| 6.5 | Email templates created per product type | Purchase confirmations | Medium |
| 6.6 | Sequence templates created (nurture, upsell, abandoner, re-engagement) | Automated flows | Medium |

## 7. Secrets & Configuration

| # | Item | Required For | Priority |
|---|------|-------------|----------|
| 7.1 | Doppler project created for the client | Centralized secrets management | High |
| 7.2 | All API keys migrated to Doppler (Resend, PayMob, Stripe, Meta, GA4) | Secure credential storage | High |
| 7.3 | Telegram bot token configured | Hot lead and purchase alerts | Medium |
| 7.4 | Telegram chat ID for sales team channel | Alert routing | Medium |

## 8. Quiz & Lead Qualification

| # | Item | Required For | Priority |
|---|------|-------------|----------|
| 8.1 | Quiz questions finalized (behavioral + qualifying) | Lead qualification | High |
| 8.2 | Scoring weights set per qualifying question answer | Tier calculation | High |
| 8.3 | Tier thresholds agreed (HIGH/MEDIUM/LOW cutoff scores) | Lead routing | High |
| 8.4 | Tier routing rules configured (HIGH -> WhatsApp, LOW -> nurture) | Lead handling | High |
| 8.5 | Quiz results page personalized per tier | User experience | Medium |

## 9. CRM & Lead Scoring

| # | Item | Required For | Priority |
|---|------|-------------|----------|
| 9.1 | CRM scoring weights configured (status, profile, attribution, recency, intent, quiz, WhatsApp, qualifying) | Lead prioritization | Medium |
| 9.2 | Tier thresholds set (hot/warm/cold/dead score cutoffs) | Sales team triage | Medium |
| 9.3 | SLA rules per tier defined (e.g., hot = 5 min, warm = same-day) | Response time management | Medium |
| 9.4 | Sequence auto-enrollment triggers configured | Automated follow-up | Medium |

## 10. Insights Dashboard

| # | Item | Required For | Priority |
|---|------|-------------|----------|
| 10.1 | GA4 property ID connected in admin settings | Traffic analytics | Medium |
| 10.2 | Meta Ads account ID and access token configured | Ad performance tracking | Medium |
| 10.3 | Clarity project ID set | Behavioral analytics | Low |
| 10.4 | Resend webhook connected for email events | Email delivery tracking | Medium |
| 10.5 | Tracking script deployed on public site (siteEvents collection active) | Behavioral data | High |
| 10.6 | All six dashboard tabs verified loading without errors | Analytics readiness | Medium |

---

## Notes

- Items marked **High** should be completed before campaign launch
- Items marked **Medium** should be completed within first 2 weeks
- Items marked **Low** can be addressed during optimization phase
- Blocked items should be escalated to active_state blockers
- This checklist maps to the portal Tasks feature — create tasks for each item
