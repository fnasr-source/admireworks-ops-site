# Project Launch — Sequences System

Multi-step email + WhatsApp workflows triggered by lead events. Edrak Space has the most mature implementation; Slim Game adds quiz-tier routing on top. Every new project ships sequences — they're how leads get nurtured without a human in the loop.

By the end of this workflow the new project can: define a sequence in the admin, trigger it from a lead event, track per-step analytics, and preview + test before going live.

## What A Sequence Is

A **sequence** is an ordered list of steps. Each **step** is either an email or a WhatsApp message, with a delay (e.g., "send 2 hours after step 1") and optional branching (e.g., "only if lead opened step 1").

Sequences are triggered by **events** — a new qualified lead, a form submission, a tier assignment from the quiz. Events live in the `sequenceEvents` collection; the sequence runner picks them up and schedules sends.

## Data Model

### Core collections

```
sequences/{id}
  - name, description
  - triggerEvent: string
  - status: 'draft' | 'active' | 'paused' | 'archived'
  - steps: [{ id, channel, templateId, delayMinutes, conditions }]

sequenceRuns/{id}
  - sequenceId
  - leadId
  - status: 'running' | 'completed' | 'paused' | 'failed'
  - currentStepIndex
  - startedAt, lastStepAt, completedAt

sequenceStepLogs/{id}
  - runId
  - stepIndex
  - channel, status ('sent' | 'failed' | 'skipped')
  - sentAt, openedAt, clickedAt, repliedAt
  - vendorId (Resend message ID or WhatsApp message ID)
```

### Templates collection

`emailTemplates/{id}` — subject, HTML body, text fallback, variables.
`whatsappTemplates/{id}` — Meta-approved template name, locale, parameters.

WhatsApp templates must be pre-approved in Meta Business Manager. You can't send ad-hoc copy to un-engaged users — only to users within a 24-hour conversation window.

## Admin UI

### Sequences list page

`/admin/sequences` — DataTable of all sequences, with run counts and last-activity timestamps. Actions: new, edit, duplicate, pause, archive.

### Sequence builder

`/admin/sequences/[id]/edit` — drag-drop or vertical list of steps. Per step:
- Channel toggle (email / whatsapp)
- Template picker
- Delay input (minutes / hours / days)
- Conditions (opened previous? replied? tier?)

Reference: `Edrak Space/apps/web/src/app/admin/sequences/[id]/`.

### Step preview

Each step has a preview panel: renders the template with sample variables. For WhatsApp, shows the approved template preview from Meta.

### Tester

Before activating, run the sequence end-to-end against a test lead. Use a real email address + real WhatsApp number (yours). Verify delivery, timing, and tracking.

### Analytics

Per-step: sent count, delivery rate, open rate (email), reply rate. Per-sequence: funnel from step 1 → completion.

Reference: `Edrak Space/apps/web/src/app/admin/sequences/analytics/`.

## Execution Backend

### Cron-driven runner

`POST /api/cron/sequences/tick` — runs every 5 minutes. For each `sequenceRuns` in status `running`, check if the next step's delay has elapsed; if yes, send and advance.

Guarded by a cron secret header. Register as an App Hosting cron job.

### Send helpers

- `src/lib/email/sendViaResend.ts` — wraps Resend API, handles template variables, records `vendorId`.
- `src/lib/whatsapp/sendTemplate.ts` — wraps WhatsApp Cloud API, records vendor message ID.

Both write a `sequenceStepLogs` doc immediately on send attempt (status: 'sent' or 'failed').

### Inbound event wiring

- Resend webhook → `/api/webhooks/resend` → updates `sequenceStepLogs` opened/clicked timestamps.
- WhatsApp webhook (workflow 05) → updates replied timestamp, can branch sequence.

## Quiz-Tier Routing (Slim Game Pattern)

### Tier → sequence mapping

Slim Game's 9-question quiz produces a score → tier (HIGH ≥38, MEDIUM 28–37, LOW <28). Each tier triggers a different sequence:

- HIGH → `seq_high_sla` — 5-minute WhatsApp response window, calls booked within 24h
- MEDIUM → `seq_medium_nurture` — email-heavy, 7-day horizon
- LOW → `seq_low_autoresponder` — single email, no WhatsApp

Implement in the quiz submit handler: compute tier, write to `leads/{id}.tier`, emit `qualifiedLead` event, sequence runner picks up the right sequence based on tier.

Reference: `The Slim Game/apps/web/src/app/api/quiz/submit/route.ts` + `The Slim Game/apps/web/src/lib/sequence-routing.ts`.

## Common Pitfalls

- **Don't skip the 24-hour WhatsApp window check.** Sending outside the window = Meta account ban risk. Use the "last user message" timestamp to gate.
- **Don't hard-code delays in ms.** Users think in hours and days. Store `delayMinutes` and convert on display.
- **Don't run the cron more often than every 5 min.** More frequent = Firestore cost with no UX benefit.
- **Always idempotent.** If a tick fails mid-send, the retry shouldn't double-send. Use `sequenceStepLogs` as the dedup marker.

## Source of truth

- Full sequences implementation: `Edrak Space/apps/web/src/app/admin/sequences/`
- Execution backend: `Edrak Space/apps/web/src/lib/sequences/` + `Edrak Space/apps/web/src/app/api/cron/sequences/`
- Tier routing (Slim Game): `The Slim Game/apps/web/src/lib/sequence-routing.ts`
- Resend wrapper: `Basseqat/src/lib/email/sendViaResend.ts`
- WhatsApp template sender: `Basseqat/src/lib/whatsapp/sendTemplate.ts`
