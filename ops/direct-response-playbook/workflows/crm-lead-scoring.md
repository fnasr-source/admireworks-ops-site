# CRM Lead Scoring & Follow-Up Engine

> SOP for implementing weighted lead scoring with automated follow-up sequences.
> Reference implementation: The Slim Game (`/Users/user/Documents/IDE Projects/The Slim Game/`)

---

## Overview

The lead scoring system assigns a 0-100 normalized score to every lead based on 11 weighted dimensions. Scores determine the lead's tier (Hot / Warm / Cold / Dead), which drives follow-up urgency and routing. The scoring config is stored in Firestore and editable by admins without code changes.

```
Lead Activity (status change, quiz, WhatsApp, email, site visit)
    |
    v
scoreLeadWithConfig(lead, config) -> 0-100 score
    |
    +-> Hot  (>= 60): Instant follow-up, Telegram alert, 5-min SLA
    +-> Warm (>= 30): Standard sequence, 24-hour follow-up
    +-> Cold (>= 15): Nurture list, weekly content
    +-> Dead (< 15):  No action
```

---

## Scoring Dimensions

### The 11 Dimensions

| # | Dimension | Weight Range | Key Signals |
|---|---|---|---|
| 1 | **Status/Intent** | 0-40 | Lead status: `checkout_started` (40), `pending_payment` (38), `purchased_entry_offer` (35), `offer_clicked` (30), `quiz_completed` (25), `new` (3) |
| 2 | **Profile Completeness** | 0-20 | hasName (+5), hasEmail (+5), hasOccupation (+5), hasAgeRange (+5) |
| 3 | **Attribution Quality** | 0-10 | Paid source like fb/ig/google (+10), organic/referral (+5), fbclid/gclid presence (+10) |
| 4 | **Recency** | 0-20 | Active <1 day (+20), <3 days (+15), <7 days (+10), <14 days (+5) |
| 5 | **Entry Offer Intent** | 0-18 | Intent signal (+8), qualified for core program (+10) |
| 6 | **Quiz Segment** | 0-18 | Quiz completed (+8), segment match (+5 to +10 depending on persona) |
| 7 | **WhatsApp Engagement** | 0-18 | Replied (+5), asked 2+ questions (+5), asked about price (+8), high-intent conversation signals (+8) |
| 8 | **Qualification (LEGACY)** | 0 | Removed to avoid double-counting with dim 11. Field kept for backward compatibility. |
| 9 | **Email Engagement** | 0-18 | Opens: 4pts each (cap 3 opens = 12 max), Clicks: 3pts each (cap 2 clicks = 6 max) |
| 10 | **Site Presence** | 0-15 | Page views above 2: 2pts each (cap 5 extra = 10 max), Dwell >2 min (+5) |
| 11 | **Qualifying Answers** | 0-25 | From unified quiz: HIGH tier (+25), MEDIUM (+10), LOW (+0) |

### Score Normalization

Raw score is summed across all dimensions, then normalized to 0-100:

```typescript
const maxPossible = computeMaxPossible(config); // sum of all max weights
const score = Math.min(100, Math.round((raw / maxPossible) * 100));
```

---

## Tier Classification

### Thresholds

| Tier | Score Range | Arabic Label | Icon | Recommendation |
|---|---|---|---|---|
| **Hot** | >= 60 | ساخن | fire | Instant call / hot lead sequence -- contact today |
| **Warm** | >= 30 | دافئ | thermometer | Standard sequence -- follow up within 24 hours |
| **Cold** | >= 15 | بارد | snowflake | Nurture list -- weekly value content |
| **Dead** | < 15 | غير نشط | zzz | No action (also forced for `unsubscribed` / `invalid` status) |

### Threshold Configuration

Thresholds are stored in the scoring config and can be adjusted from the admin UI (`/admin/crm/scoring/settings`):

```typescript
hotThreshold: 60,
warmThreshold: 30,
coldThreshold: 15,
```

---

## Scoring Config

### Storage

The scoring config lives in Firestore at `appConfig/leadScoring`. The system loads it with a 2-minute TTL cache and falls back to `DEFAULT_SCORING_CONFIG` if the document is missing or malformed.

**Key file:** `apps/web/src/lib/crm/lead-scoring.ts`

### Config Structure

```typescript
interface LeadScoringConfig {
    version: number;

    // Dim 1: Status weights
    statusWeights: Record<LeadStatus, number>;

    // Dim 2: Profile completeness
    hasName: number;
    hasEmail: number;
    hasOccupation: number;
    hasAgeRange: number;

    // Dim 3: Attribution
    paidSource: number;
    organicSource: number;

    // Dim 4: Recency
    activeWithin1Day: number;
    activeWithin3Days: number;
    activeWithin7Days: number;
    activeWithin14Days: number;

    // Dim 5: Entry offer intent
    entryOfferIntent: number;
    entryOfferQualified: number;

    // Dim 6: Quiz segment
    quizCompleted: number;
    quizSegmentMatch: Record<string, number>;

    // Dim 7: WhatsApp engagement
    whatsappReplied: number;
    whatsappQuestionsAsked: number;
    whatsappPriceAsked: number;

    // Dim 8: Qualification (legacy, zeroed out)
    qualificationPerCriterionMet: number;

    // Dim 9: Email engagement
    emailOpenPerOpen: number;
    emailOpenCap: number;
    emailClickPerClick: number;
    emailClickCap: number;

    // Dim 10: Site presence
    sitePageViewMin: number;
    sitePageViewPerUnit: number;
    sitePageViewCap: number;
    siteDwellThresholdMs: number;
    siteDwellBonus: number;

    // Dim 11: Qualifying answers
    qualifyingTierWeights: { high: number; medium: number; low: number };

    // Tier thresholds
    hotThreshold: number;
    warmThreshold: number;
    coldThreshold: number;
}
```

### Default Config Values

```typescript
export const DEFAULT_SCORING_CONFIG: LeadScoringConfig = {
    version: 2,
    statusWeights: {
        checkout_started: 40,
        purchased_entry_offer: 35,
        offer_clicked: 30,
        quiz_completed: 25,
        offer_viewed: 20,
        attended: 15,
        reminded: 10,
        registered: 8,
        nurturing: 5,
        new: 3,
        pending_payment: 38,
        pending_verification: 32,
        customer: 10,
        no_show: 2,
        unsubscribed: 0,
        invalid: 0,
    },
    hasName: 5,
    hasEmail: 5,
    hasOccupation: 5,
    hasAgeRange: 5,
    paidSource: 10,
    organicSource: 5,
    activeWithin1Day: 20,
    activeWithin3Days: 15,
    activeWithin7Days: 10,
    activeWithin14Days: 5,
    entryOfferIntent: 8,
    entryOfferQualified: 10,
    quizCompleted: 8,
    quizSegmentMatch: {
        busy_dieter: 7,
        yo_yo_dieter: 10,
        diet_explorer: 5,
        emotional_eater: 9,
        overwhelmed_juggler: 7,
        cycle_breaker: 10,
    },
    whatsappReplied: 5,
    whatsappQuestionsAsked: 5,
    whatsappPriceAsked: 8,
    qualificationPerCriterionMet: 0,
    emailOpenPerOpen: 4,
    emailOpenCap: 3,
    emailClickPerClick: 3,
    emailClickCap: 2,
    sitePageViewMin: 2,
    sitePageViewPerUnit: 2,
    sitePageViewCap: 5,
    siteDwellThresholdMs: 120000,
    siteDwellBonus: 5,
    qualifyingTierWeights: { high: 25, medium: 10, low: 0 },
    hotThreshold: 60,
    warmThreshold: 30,
    coldThreshold: 15,
};
```

---

## Score Breakdown & Explainability

Every score comes with a `reasons` array of Arabic, human-readable explanations. Each reason includes:

```typescript
interface LeadScoreReason {
    dimension: string;       // e.g., "statusScore", "recencyScore"
    points: number;          // points contributed
    label: string;           // Arabic explanation, e.g., "حالة العميل: بدأ عملية الدفع (+40)"
}
```

The `topSignal` field contains the single highest-contributing reason, used for quick display in lead lists.

The `recommendation` field contains an Arabic action recommendation based on tier:

| Tier | Recommendation |
|---|---|
| Hot + checkout_started | "اتصال فوري -- أقرب لإتمام الشراء" |
| Hot (other) | "استخدم تسلسل العميل الساخن -- اتصل اليوم" |
| Warm | "التسلسل القياسي -- متابعة خلال 24 ساعة" |
| Cold | "أضف لقائمة الرعاية -- تواصل بمحتوى ذي قيمة أسبوعيا" |
| Dead | "لا توجد إجراءات موصى بها -- عميل غير نشط" |

---

## Follow-Up Engine

### Architecture

Firestore-backed sequence system with three collections:

| Collection | Purpose |
|---|---|
| `salesSequences` | Sequence definitions (steps, triggers, channels) |
| `sequenceEnrollments` | Per-lead enrollment records with status tracking |
| `salesTasks` | Individual tasks created from sequence steps |

**Key file:** `apps/web/src/lib/crm/follow-up-engine.ts`

### Sequence Structure

```typescript
interface SalesSequence {
    id: string;
    name: string;           // Arabic name
    nameEn?: string;        // English name (optional)
    status: 'active' | 'paused' | 'draft' | 'archived';
    trigger: {
        type: 'status_change' | 'tag_added' | 'qualifying_completed' | 'qualifying_tier';
        conditions: {
            toStatus?: string[];        // for status_change
            fromStatus?: string[];      // for status_change
            tag?: string;               // for tag_added / qualifying_completed
            tier?: string;              // for qualifying_tier
        };
    };
    steps: SequenceStep[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

interface SequenceStep {
    order: number;
    title: string;
    description: string;
    channel: 'call' | 'whatsapp' | 'email';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dayOffset?: number;         // days after enrollment
    hoursOffset?: number;       // hours after enrollment
    minutesOffset?: number;     // minutes after enrollment
    autoMessage?: string;       // pre-composed message for agent
}
```

### Trigger Types

| Type | Fires When | Condition Fields |
|---|---|---|
| `status_change` | Lead status changes | `toStatus[]`, `fromStatus[]` |
| `tag_added` | Quiz profile tag matches | `tag` (e.g., `quiz_emotional_eater`) |
| `qualifying_completed` | Qualifying tier computed | `tag` (e.g., `qualifying_high`) |
| `qualifying_tier` | Qualifying tier computed | `tier` (e.g., `high`, `medium`, `low`) |

### Enrollment Flow

1. Trigger fires (status change, quiz completion, tier computation)
2. `triggerSequenceEnrollment()` or `triggerQualifyingTier()` finds matching active sequences
3. Checks if lead is already enrolled (dedup)
4. Creates enrollment record in `sequenceEnrollments`
5. Creates first task in `salesTasks` (due immediately)
6. On task completion, `advanceEnrollment()` creates the next task

**Key file (server-side triggers):** `apps/web/src/lib/crm/sequence-trigger-admin.ts`

### Step Scheduling

Steps support flexible timing offsets from enrollment:

```typescript
function calculateDueDate(baseTime: number, step: SequenceStep): Date {
    const dueDate = new Date(baseTime);
    if (step.dayOffset > 0) dueDate.setDate(dueDate.getDate() + step.dayOffset);
    if (step.hoursOffset > 0) dueDate.setHours(dueDate.getHours() + step.hoursOffset);
    if (step.minutesOffset > 0) dueDate.setMinutes(dueDate.getMinutes() + step.minutesOffset);
    return dueDate;
}
```

---

## Default Sequence Templates

### 1. Quiz Follow-Up (status_change: quiz_completed)

| Step | Timing | Channel | Action |
|---|---|---|---|
| 1 | Immediate | WhatsApp | Welcome + personalized results summary |
| 2 | +1 day | WhatsApp | Value content related to quiz profile |
| 3 | +3 days | WhatsApp | Entry offer promotion |
| 4 | +7 days | Email | Full case study / testimonial |

### 2. Checkout Abandoner (status_change: checkout_started)

| Step | Timing | Channel | Action |
|---|---|---|---|
| 1 | +5 minutes | WhatsApp | "Need help completing your order?" |
| 2 | +1 hour | WhatsApp | Address common objections |
| 3 | +1 day | Email | Discount code reminder |
| 4 | +3 days | Call | Personal follow-up call |

### 3. Entry Offer Upsell (status_change: purchased_entry_offer)

| Step | Timing | Channel | Action |
|---|---|---|---|
| 1 | +3 days | WhatsApp | Check-in on program progress |
| 2 | +7 days | WhatsApp | Share success stories from full program |
| 3 | +14 days | Call | Personal consultation offer for full program |

### 4. Cold Re-Engagement (scheduled, targets cold tier)

| Step | Timing | Channel | Action |
|---|---|---|---|
| 1 | Immediate | Email | New value content / blog post |
| 2 | +7 days | Email | New testimonial / case study |
| 3 | +14 days | Email | Limited-time offer |
| 4 | +21 days | WhatsApp | Personal check-in |

### 5. HIGH Tier Qualifying (qualifying_tier: high)

| Step | Timing | Channel | Action |
|---|---|---|---|
| 1 | Immediate | WhatsApp | Personal welcome with consultation link |
| 2 | +5 minutes | Call | Agent call (5-min SLA) |
| 3 | +30 minutes | WhatsApp | Follow-up if no answer |
| 4 | +4 hours | WhatsApp | Discount expiry reminder |

### 6. MEDIUM Tier Qualifying (qualifying_tier: medium)

| Step | Timing | Channel | Action |
|---|---|---|---|
| 1 | Immediate | WhatsApp | Welcome with quiz results summary |
| 2 | +4 hours | WhatsApp | Entry offer introduction |
| 3 | +1 day | Email | Detailed program comparison |
| 4 | +3 days | WhatsApp | Testimonial from similar profile |

---

## Hot Lead Detection

### What Makes a Lead "Hot"

A lead becomes hot when its normalized score reaches 60+. The strongest signals are:

| Signal | Points | Why It Matters |
|---|---|---|
| `checkout_started` status | 40 (dim 1) | Already in the buying process |
| Active within 24 hours | 20 (dim 4) | Recent engagement |
| HIGH qualifying tier | 25 (dim 11) | Quiz answers show strong readiness |
| WhatsApp price inquiry | 8 (dim 7) | Explicit purchase intent signal |
| Paid ad source | 10 (dim 3) | Came from a targeted ad |

A lead with `checkout_started` + active today + HIGH tier + paid source = score of ~73+ = definite HOT.

### Telegram Alerts

When a lead crosses the hot threshold, the system sends a Telegram alert to the sales team channel:

- Lead name, phone, email
- Score and top signal
- Direct link to lead profile in admin
- Qualifying tier badge
- Response SLA reminder

**Admin route:** `/admin/integrations/telegram`

### 5-Minute SLA

Hot leads must receive first human contact within 5 minutes. The system:

1. Creates an `urgent` priority task in `salesTasks`
2. Sends Telegram alert to sales team
3. Task overdue detection starts at creation time
4. If not completed within SLA, escalation triggers

### Hot Leads Queue

Dedicated admin page (`/admin/hot-leads`) shows only leads with score >= 60, sorted by:
1. Recency (most recently active first)
2. Score (highest first within same recency band)

Displays: name, score, top signal, tier badge, time since last activity, assigned agent.

---

## Overdue Task Detection

Tasks that pass their due date without completion are flagged at escalation levels:

| Days Overdue | Level | Action |
|---|---|---|
| 1-2 | Warning | Yellow indicator in task list |
| 3-6 | Critical | Orange indicator, notification to team lead |
| 7+ | Urgent | Red indicator, Telegram escalation |

```typescript
export function detectOverdueTasks(tasks: SalesTask[]): OverdueTaskReport[] {
    return tasks
        .filter((t) => t.status === "pending" || t.status === "in_progress")
        .map((task) => {
            const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
            const escalationLevel = daysOverdue >= 7 ? "urgent"
                : daysOverdue >= 3 ? "critical" : "warning";
            return { task, daysOverdue, escalationLevel };
        });
}
```

---

## Agent Workload Distribution

The follow-up engine tracks per-agent workload:

```typescript
interface AgentWorkload {
    agentEmail: string;
    openTasks: number;
    overdueTasks: number;
    completedThisWeek: number;
    load: "light" | "medium" | "heavy" | "overloaded";
}
```

Visible in `/admin/crm/team` for team lead to rebalance assignments.

---

## Adapting for a New Client

### Step 1 — Copy the scoring system

Copy `lead-scoring.ts` and adjust:
- `statusWeights`: replace with the new project's lead statuses
- `quizSegmentMatch`: replace persona names with new quiz profiles
- Remove dimensions that don't apply (e.g., if no WhatsApp, zero out dim 7)

### Step 2 — Create the Firestore config document

Create `appConfig/leadScoring` in the new project's Firestore with the default config. This allows admin tuning without deployments.

### Step 3 — Build default sequences

Create at minimum these sequences in `salesSequences`:
1. Quiz follow-up
2. Checkout abandoner
3. High-tier qualifying
4. Cold re-engagement

### Step 4 — Configure Telegram alerts

Set up a Telegram bot + sales team chat, configure the bot token and chat ID in the project's environment variables.

### Step 5 — Calibrate after launch

After 100+ leads:
- Review score distribution — if 80% are Hot, thresholds are too low
- Review conversion rates per tier — ensure Hot actually converts better
- Adjust weights for dimensions that are most predictive of conversion
- Adjust tier thresholds based on team capacity (Hot tier should be manageable volume)

### Step 6 — Admin scoring settings page

Build `/admin/crm/scoring/settings` to allow non-technical team members to adjust weights and thresholds through the UI, which writes directly to `appConfig/leadScoring`.
