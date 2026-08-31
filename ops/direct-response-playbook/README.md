# Direct Response Playbook

This section turns `Internal AW SOP` into the canonical reusable playbook for onboarding, launching, and operating direct-response systems across multiple clients.

## Purpose

Use this playbook when a client needs a full marketing engine, not just isolated deliverables.

Every active client workspace should support:
- a clear offer and funnel architecture
- reusable ad, landing page, email, and automation assets
- tracking and reporting standards
- launch, optimization, and maintenance SOPs
- admin area workflows for lead and conversation handling

## Required Client Structure

Each client workspace should expose these top-level folders:

| Folder | Required contents |
|---|---|
| `ads/` | Ad angle matrix, hook library, templates, controls, final variants |
| `landing-pages/` | Page strategy, wireframes, section order, copy blocks, QA |
| `emails/` | Email and SMS sequences, trigger notes, send windows, CTA map |
| `flows/` | Funnel map, automation logic, routing rules, retargeting logic |
| `offers/` | Front-end offer, bonuses, pricing, bumps, upsells, downsells |
| `tracking/` | Pixels, events, UTMs, naming, domains, reporting inputs |
| `reports/` | KPI scorecards, weekly reporting templates, experiment log, QA evidence |
| `sops/` | Setup, launch, optimization, maintenance, troubleshooting, rollback |
| `admin/` | Lead triage rules, statuses, assignment logic, inbox handling, audits |

Legacy folders like `messaging/` are deprecated — new client workspaces do not include it. Existing client folders that contain data in `messaging/` may keep it.

## Step-By-Step Playbook

### 1. Discovery & Research

> ⚠️ **Before starting strategy generation**, run the **Discovery Input Checklist** at:
> `ops/direct-response-playbook/checklists/discovery-input-checklist.md`
>
> If any required inputs are missing, produce a gap analysis with specific questions for the client. Do not generate strategy with incomplete inputs.

Store the raw inputs in `briefing/`, `kb/`, `meetings/`, and `research/`.

Required outputs:
- client avatar and segment breakdown
- core offer and promise
- market pains, objections, and desired outcomes
- competitor positioning and proof patterns
- angle bank and messaging pillars

### 2. Strategy

Store the strategy system in `strategy/`, `offers/`, and `flows/`.

Required outputs:
- funnel type and conversion path
- traffic channel mix
- front-end offer, pricing, bonuses, and upsell path
- messaging pillars and proof stack
- admin operating model for inbound leads and handoffs

### 3. Creation

Store creative production in `ads/`, `landing-pages/`, `emails/`, and `presentations/`.

Required outputs:
- ad copy templates plus final launch-ready variants
- landing page structure and wireframe
- email and SMS sequences
- scripts and content blocks for webinar, VSL, or sales call support

### 4. Tech Setup

Store technical implementation notes in `tracking/`, `flows/`, `admin/`, and `sops/`.

Required outputs:
- pixel and attribution map
- domains and URL plan
- form and CRM destination map
- automation triggers and fallback logic
- admin statuses, ownership rules, and escalation path

### 4.5. Tracking Architecture Setup

> See [`workflows/tracking-architecture.md`](workflows/tracking-architecture.md) for the full SOP.

Set up the multi-channel tracking stack: client-side pixel, server-side CAPI, Firestore event ingestion, GA4 measurement protocol, and Clarity integration. Configure UTM structure, event type allowlists, and attribution data flow.

### 4.6. Quiz & Lead Qualification Setup

> See [`workflows/quiz-lead-qualification.md`](workflows/quiz-lead-qualification.md) for the full SOP.

Configure the quiz funnel: question set, dual-purpose scoring (behavioral profiling + qualifying score), tier thresholds (HIGH/MEDIUM/LOW), tier-based routing rules, and results page personalization.

### 4.7. CRM & Lead Scoring Configuration

> See [`workflows/crm-lead-scoring.md`](workflows/crm-lead-scoring.md) for the full SOP.

Set up lead scoring with weighted rules across 8+ dimensions (status, profile, attribution, recency, intent, quiz, WhatsApp, qualifying). Configure tier thresholds (hot/warm/cold/dead), SLA rules per tier, and sequence auto-enrollment triggers.

### 4.8. Email System Setup

> See [`workflows/email-system-setup.md`](workflows/email-system-setup.md) for the full SOP.

Configure Resend integration with dual-stream architecture (transactional + marketing subdomains). Set up SPF/DKIM/DMARC, email templates per product and qualifying tier, automated sequences (nurture, upsell, abandoner recovery, re-engagement), and delivery tracking via Resend webhooks.

### 4.9. Payment Integration

> See [`workflows/payment-integration.md`](workflows/payment-integration.md) for the full SOP.

Set up the payment stack: PayMob for Egypt (Unified Checkout or hosted product links), Stripe for international, or dual-provider. Configure webhook handlers, payment record creation, lead status updates, confirmation emails, Telegram notifications, and server-side GA4/Meta CAPI tracking.

### 5. Launch Checklist

The default reusable checklist is [`checklists/post-deployment-live-qa.md`](checklists/post-deployment-live-qa.md).

Before going live, confirm:
- builds pass
- deploy target and service account are correct
- forms, pixels, and automations are connected
- admin routes are reachable
- message and notification flows work end to end

### 6. Optimization Loops

Store active tests and conclusions in `reports/` and `active_state/`.

Required loop:
- review KPIs on a fixed cadence
- isolate the weakest funnel step
- create one variable test at a time
- log result, decision, and next action
- update controls and kill weak variants

### 7. Maintenance

Store recurring operational SOPs in `sops/` and recurring reporting in `reports/`.

Required maintenance coverage:
- weekly health review
- monthly performance review
- tracking and integration checks
- rollback and incident handling
- retention and LTV improvements

## Reference Systems

This pass consolidates reusable learnings from the strongest reference implementations:
- [`reference-systems/the-slim-game.md`](reference-systems/the-slim-game.md) -- Quiz funnels, qualifying tiers, WhatsApp + AI reply, direct-response landing pages
- [`reference-systems/edrak-space.md`](reference-systems/edrak-space.md) -- Webinar funnels, Puck CMS page builder, bilingual AR+EN, LOCKED governance
- [`reference-systems/intentos.md`](reference-systems/intentos.md) -- B2B pipeline orchestration, Server Actions pattern, Apollo enrichment, kill-switch system

Those docs include:
- funnel architectures that worked best
- high-performing hooks and messaging angles
- landing page and nurture patterns
- automation and admin-area lessons
- exact existing paths inside `Internal AW SOP` where related materials currently live

## Added In This Pass

The playbook now explicitly includes reusable SOPs for:
- offer creation and front-end or upsell structuring
- retention and LTV flows
- admin area workflows for lead handling, assignment, and status tracking
- post-deployment live QA for WhatsApp, AI replies, and admin verification

See:
- [`workflows/offers-and-upsells.md`](workflows/offers-and-upsells.md)
- [`workflows/retention-and-ltv.md`](workflows/retention-and-ltv.md)
- [`workflows/admin-area-workflows.md`](workflows/admin-area-workflows.md)
- [`workflows/payment-integration.md`](workflows/payment-integration.md)
- [`workflows/email-system-setup.md`](workflows/email-system-setup.md)
- [`workflows/insights-dashboard.md`](workflows/insights-dashboard.md)
- [`workflows/theme-system.md`](workflows/theme-system.md)
- [`workflows/multi-tenant-abstraction.md`](workflows/multi-tenant-abstraction.md)

---

## Tools & Integrations Catalog

| Tool | Category | Purpose |
|---|---|---|
| **Resend** | Email | Transactional and marketing email delivery via API. Dual-stream architecture with separate subdomains. |
| **PayMob** | Payments | Egypt payment provider. Cards, wallets, kiosk, installments. Unified Checkout API or hosted product links. |
| **Stripe** | Payments | International payment provider. Cards, Apple Pay, Google Pay. PaymentElement for inline forms. |
| **Meta CAPI** | Tracking | Server-side conversion API for Meta (Facebook/Instagram) ads. Bypasses ad blockers for accurate attribution. |
| **GA4** | Analytics | Google Analytics 4 for traffic, sessions, and conversion tracking. Data API for server-side insights. |
| **Clarity** | Analytics | Microsoft Clarity for heatmaps, session recordings, scroll depth, and behavioral analytics. |
| **Telegram** | Alerts | Bot API for real-time hot lead alerts, purchase notifications, and SLA breach warnings to the sales team. |
| **Doppler** | Secrets | Secrets management platform. Stores API keys, credentials, and environment variables outside of git. |
| **Puck CMS** | Content | Visual page builder for landing pages and content blocks. Drag-and-drop editing with code-level control. |

