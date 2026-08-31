# Admin Area Workflows

Use this workflow to configure the client admin area for production-grade lead management, scoring, routing, and automation. Based on the proven patterns from The Slim Game reference implementation.

> **Admin chrome patterns** (navigation catalog, integrations hub, access policy) now live in the project-launch-playbook:
> - [`ops/project-launch-playbook/workflows/02-admin-ui-adoption.md`](../../project-launch-playbook/workflows/02-admin-ui-adoption.md) — component library (Tailwind fork + Mond vanilla-CSS fork)
> - [`ops/project-launch-playbook/workflows/03-admin-navigation-catalog.md`](../../project-launch-playbook/workflows/03-admin-navigation-catalog.md) — typed nav tree
> - [`ops/project-launch-playbook/workflows/04-admin-integrations-hub.md`](../../project-launch-playbook/workflows/04-admin-integrations-hub.md) — integrations catalog + drawer pattern
> - [`ops/project-launch-playbook/workflows/05-admin-access-policy.md`](../../project-launch-playbook/workflows/05-admin-access-policy.md) — 3-tier auth resolver, role/capability matrix
>
> This workflow focuses on the **operational behaviors** running inside that chrome: scoring, routing, sequences, hot-lead detection.

---

## Lead Scoring

### Weighted scoring model

Leads are scored on a 0-100 scale across 8+ dimensions. Each dimension has a configurable weight that admin managers can tune from the scoring settings page (`/admin/crm/scoring/settings`) without code changes.

| Dimension | Max points | What it measures |
|---|---|---|
| Status score | 40 | Current lead status (e.g., `checkout_started` = 35, `quiz_completed` = 15, `new` = 5) |
| Profile score | 20 | Completeness of lead data (has name, email, phone, etc.) |
| Attribution score | 10 | Quality of acquisition source (paid ad > organic > direct) |
| Recency score | 20 | How recently the lead was active (within 24h = full, decays over 7/14/30 days) |
| Intent score | 18 | Behavioral intent signals (checkout started, offer viewed, offer clicked) |
| Quiz score | 18 | Quiz completion and segment match quality |
| WhatsApp score | 18 | WhatsApp engagement level (messages sent, response rate) |
| Email engagement score | 15 | Email opens, clicks, replies |
| Site presence score | 10 | On-site behavior (page views, scroll depth, video engagement) |
| Qualifying score | 25 | Quiz qualifying tier (HIGH = 25, MEDIUM = 15, LOW = 5) |

### Score calculation

The total score is the sum of all dimension scores, capped at 100. The scoring function runs:

- On lead creation (initial score)
- On any lead status change
- On quiz completion
- On qualifying tier assignment
- Periodically via batch re-scoring

### Configuration storage

Scoring weights and thresholds are stored in `appConfig/leadScoring` Firestore document. The scoring engine reads this config at runtime. Changes made in the admin UI take effect on the next scoring run without deployment.

---

## Hot Lead Detection

### Tier definitions

| Tier | Score range | Meaning | Action |
|---|---|---|---|
| Hot | 70-100 | Ready to buy. High qualifying score + recent engagement | Immediate contact (5-min SLA) |
| Warm | 40-69 | Interested but needs guidance. Mid qualifying + some engagement | Same-day contact |
| Cold | 15-39 | Early stage or inactive. Low qualifying or stale | Automated nurture sequence |
| Dead | 0-14 | No engagement, invalid, or unsubscribed | No active outreach |

### Configurable thresholds

Tier boundaries are stored in the `appConfig/leadScoring` document and editable from the scoring settings page:

```
thresholds:
  hot: 70
  warm: 40
  cold: 15
```

### Hot lead queue

The hot leads page (`/admin/hot-leads`) shows leads detected as hot within the last 2 hours using a real-time Firestore subscription. Each lead card shows:

- Name and phone
- Qualifying score and tier badge
- Lead score
- SLA countdown timer (ticks every second)
- SLA status badge (OK / Urgent / Breach)
- Quick action buttons (WhatsApp, Profile)

### SLA rules

| Elapsed time | Status | Display |
|---|---|---|
| < 3 minutes | OK | Green badge |
| 3-5 minutes | Urgent | Yellow badge |
| > 5 minutes | Breach | Red badge with "SLA BREACH" |

The `hotDetectedAt` timestamp is set when a lead first crosses the hot threshold. The page queries for leads with `hotDetectedAt >= now - 2 hours`.

---

## Tier-Based Routing

### HIGH tier (qualifying score >= 38)

1. Lead marked as hot immediately
2. `hotDetectedAt` timestamp set
3. Telegram alert sent to sales team channel
4. SLA task created (5-minute deadline)
5. Lead appears in hot leads queue
6. Route to WhatsApp consultation
7. Sales rep must respond within 5 minutes

### MEDIUM tier (qualifying score 28-37)

1. Lead routed to WhatsApp consultation (same-day SLA)
2. Sequence auto-enrollment: follow-up sequence
3. Lead appears in warm section of CRM scoring page
4. Sales rep contacts within same business day

### LOW tier (qualifying score < 28)

1. Lead routed to automated email nurture
2. Sequence auto-enrollment: nurture sequence (5-7 emails over 14-21 days)
3. No immediate sales contact
4. Re-scored periodically; promoted to warm/hot if engagement increases

---

## Sequence Automation Engine

### Trigger types

The sequence engine supports four trigger types:

| Trigger type | Fires when | Example |
|---|---|---|
| `status_change` | Lead status transitions to a specified value | `checkout_started`, `quiz_completed`, `purchased_entry_offer` |
| `tag_added` | A specific tag is added to the lead | `qualifying_high`, `abandoner` |
| `score_threshold` | Lead score crosses a tier boundary | Score drops to `cold`, score rises to `hot` |
| `qualifying_completed` | Lead's `qualifyingTier` transitions from null to a value | First qualifying result computed |
| `score_threshold_with_sla` | Score crosses tier + SLA task created | Hot lead with 5-min deadline |

### Enrollment logic

When a trigger fires:

1. Find all active sequences matching the trigger type and conditions
2. Check if the lead is already enrolled in this sequence (skip if so)
3. Check if the lead is in a higher-priority active sequence (skip if so)
4. Cancel any conflicting lower-priority sequences of the same trigger type
5. Enroll the lead in the matched sequence
6. If SLA is configured, create a `salesTasks` document with `dueDate = now + slaMinutes`

### Sequence types

| Sequence | Trigger | Steps | Purpose |
|---|---|---|---|
| Follow-up | `status_change` to `checkout_started` | 3-5 WhatsApp + email | Recover leads who started checkout |
| Abandoner recovery | `status_change` to `checkout_started` + no purchase within 1h | 3 messages over 48h | Recover cart abandoners |
| Upsell | `status_change` to `purchased_entry_offer` | 4-6 messages over 21 days | Convert entry buyers to full program |
| Nurture | `qualifying_completed` with tier LOW | 5-7 emails over 14-21 days | Educate cold leads |
| Re-engagement | `score_threshold` with tier `cold` or `dead` | 3-4 messages over 7-14 days | Reactivate inactive leads |
| Hot lead SLA | `score_threshold_with_sla` with tier `hot` | SLA task + WhatsApp | Ensure fast response to hot leads |

### Sequence step execution

Each step in a sequence specifies:

- `type`: `whatsapp`, `email`, `sms`, `task`
- `delayMinutes`: Wait time before executing this step (from enrollment or previous step)
- `template`: Message template or email template ID
- `conditions`: Optional conditions to skip the step (e.g., "skip if lead status is already `customer`")

Execution is handled by `/api/sequence-email/send` for email steps and the WhatsApp queue for WhatsApp steps.

---

## Pipeline Kanban View

### Stage definitions

The CRM pipeline (`/admin/crm`) uses a kanban view with these stages:

| Stage | Meaning | Leads in this stage |
|---|---|---|
| New | Just entered the system | `status: 'new'` |
| Quiz completed | Completed the quiz funnel | `status: 'quiz_completed'` |
| Qualified | Qualifying tier assigned | Has `qualifyingTier` value |
| Checkout started | Began checkout flow | `status: 'checkout_started'` |
| Purchased (entry) | Bought the entry offer | `status: 'purchased_entry_offer'` |
| Customer | Bought the full program | `status: 'customer'` |
| Nurturing | In automated nurture | `status: 'nurturing'` |
| Lost | Unsubscribed or invalid | `status: 'unsubscribed'` or `'invalid'` |

### Kanban card content

Each card shows:

- Lead name
- Phone number
- Qualifying tier badge (HIGH / MEDIUM / LOW)
- Lead score
- Time in current stage
- Assigned sales rep (if any)

Cards can be dragged between stages to manually update lead status.

---

## Role-Based Admin Access

### Roles

| Role | Access level | Key permissions |
|---|---|---|
| Sales Rep | Own assigned leads | View leads, send WhatsApp, log outcomes, create follow-up tasks |
| Sales Manager | All leads + team management | All rep permissions + assign leads, edit scoring weights, view team SLA compliance, manage sequences |
| Super Admin | Full system access | All manager permissions + integrations config, admin user management, system settings |

### Permission checks

- `useAdminAuth()` hook provides `user`, `isManager`, and role info
- Scoring settings page (`/admin/crm/scoring/settings`) is restricted to managers
- Sequence management is restricted to managers
- Lead assignment is restricted to managers
- Integration configuration is restricted to super admins

---

## Telegram Alerts

### Hot lead alerts

When a lead is detected as hot (qualifying tier HIGH or score crosses hot threshold):

1. Compose an HTML-formatted Telegram message with:
   - Lead name and phone
   - Qualifying score and tier
   - Product interest (if known)
   - Direct link to admin leads page
2. Send via `https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage`
3. Target the sales team chat (`TELEGRAM_CHAT_ID`)

### Purchase alerts

On every successful payment (Stripe or PayMob):

1. Compose message with:
   - Product name (Arabic label)
   - Amount and currency
   - Customer name and email
   - Link to admin leads page
2. Send to the same Telegram chat
3. Failed payments also trigger an alert with a failure indicator

### Environment variables

- `TELEGRAM_BOT_TOKEN`: Bot API token from BotFather
- `TELEGRAM_CHAT_ID`: Target chat or group ID

---

## WhatsApp Inbox

### Architecture

The WhatsApp inbox (`/admin/whatsapp`) provides:

- Conversation list with lead info and tier badges
- Real-time message display
- AI-generated reply suggestions
- Human handoff mechanism
- Lead info modal with full qualifying breakdown (Q5-Q9 answers, tier explanation)

### AI reply + human handoff

1. Incoming WhatsApp message arrives via webhook
2. AI generates a suggested reply based on:
   - Lead context (tier, status, quiz answers)
   - Conversation history
   - Product knowledge base
3. Sales rep reviews the suggestion
4. Rep can:
   - Send as-is
   - Edit and send
   - Write a fully custom reply
   - Escalate to manager
5. Handoff reason is stored on the conversation record
6. Manual replies clear any pending AI queue items

### Lead info in conversations

The conversation view shows:

- Lead name, phone, email
- Qualifying tier badge
- Qualifying score with Q5-Q9 answer breakdown
- Lead score with dimension breakdown (status, profile, attribution, recency, intent, quiz, WhatsApp, qualifying)
- Current sequence enrollment (if any)
- Purchase history

---

## Scoring Breakdown Display

The admin UI shows score breakdowns across multiple pages:

### Leads list (`/admin/leads`)

- Qualifying tier column with filter dropdown
- Lead score column

### Lead drawer (click on any lead)

- Full qualifying section with tier, score, and Q5-Q9 breakdown
- Each qualifying question shown with selected answer and points earned
- Visual score bar (max 10 per question)
- Tier threshold explanation

### CRM scoring page (`/admin/crm/scoring`)

- Tier summary cards (hot/warm/cold/dead counts)
- Filter tabs by tier
- Each lead shows:
  - Score (0-100) with color coding
  - Tier badge
  - Top signal (the strongest factor in their score)
  - Recommendation (suggested action)
  - 8-dimension breakdown chips (status, profile, source, activity, intent, quiz, WhatsApp, qualifying)
  - One-click sequence enrollment button

### Hot lead drawer

Clicking a lead in the CRM scoring page opens a detailed drawer with:

- Full score breakdown
- Qualifying tier explanation with Q5-Q9 details
- Recommended next action
- Quick action buttons (WhatsApp, create sequence, mark as priority)

---

## Weekly Admin Review Checklist

- [ ] Hot lead SLA compliance rate reviewed (target: 100% within 5 minutes)
- [ ] Warm lead same-day response rate reviewed
- [ ] Pipeline kanban reviewed for stuck leads
- [ ] Sequence enrollment counts and completion rates checked
- [ ] Scoring weight effectiveness evaluated (are high-scoring leads actually converting?)
- [ ] Telegram alert delivery verified
- [ ] WhatsApp inbox backlog cleared
- [ ] Overdue sales tasks resolved
- [ ] Dead lead re-engagement candidates identified
- [ ] Insights dashboard anomaly alerts reviewed

---

## Store In Client Workspace

- `admin/` for role definitions, queue rules, and scoring configuration
- `sops/` for handoff, escalation, and cleanup procedures
- `reports/` for SLA compliance, backlog, and health reviews
- `flows/` for sequence definitions and trigger rules
