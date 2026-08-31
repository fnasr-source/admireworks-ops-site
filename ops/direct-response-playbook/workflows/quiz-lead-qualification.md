# Quiz-Based Lead Qualification

> SOP for implementing quiz-based lead qualification with tier routing.
> Reference implementation: The Slim Game (`/Users/user/Documents/IDE Projects/The Slim Game/`)

---

## Overview

A quiz funnel serves two purposes simultaneously:

1. **Behavioral profiling** — understand the lead's psychology, pain points, and readiness
2. **Qualifying scoring** — numerically score how likely the lead is to convert

The quiz produces a qualifying tier (HIGH / MEDIUM / LOW) that determines the follow-up routing: instant human contact for hot leads, automated nurture for cold ones.

```
Ad (Meta/Google) -> Quiz Page (9 questions) -> Email Capture -> Results Page
                                                     |
                                                     v
                                          computeQualifyingTierFromQuiz()
                                                     |
                                     +---------------+---------------+
                                     |               |               |
                                   HIGH            MEDIUM           LOW
                                (>= 38 pts)     (28-37 pts)      (< 28 pts)
                                     |               |               |
                              WhatsApp +       WhatsApp +       Email nurture
                              5-min SLA       entry offer       sequence only
                              + discount      + softer CTA      No timer on
                              timer           + discount        results page
```

---

## Quiz Architecture

### Question Structure

The quiz has two segments with different purposes:

| Segment | Questions | Purpose | Scoring |
|---|---|---|---|
| **Behavioral** | Q1-Q4 | Personality profiling (IG vs OG) | No qualifying points |
| **Qualifying** | Q5-Q9 | Purchase readiness assessment | 0-10 points per answer |

### Behavioral Profiling (Q1-Q4)

Each answer is tagged with a `score` type:

| Score Type | Meaning |
|---|---|
| `IG` (Inner Game) | Emotional/identity-driven behavior |
| `OG` (Outer Game) | Systems/information-driven behavior |
| `Both` | Mixed signal — adds to both scores |
| `Neutral` | No signal |

Profile calculation:

```typescript
function getProfile(scores: { ig: number; og: number }): ProfileType {
    const diff = scores.ig - scores.og;
    if (diff >= 2) return 'emotional_eater';
    if (diff <= -2) return 'overwhelmed_juggler';
    return 'cycle_breaker';
}
```

The profile determines messaging tone, email templates, and ad retargeting segments.

### Qualifying Scoring (Q5-Q9)

Each Q5-Q9 answer carries a `qualifyingScore` from 0 to 10. These scores measure:

| Question | What It Measures | Top Answer Score |
|---|---|---|
| Q5 | Available time / life situation | 9 (has free time, wants to use it) |
| Q6 | Decision-making speed | 10 (decides and acts immediately) |
| Q7 | Belief in the approach | 10 (trusts credentialed experts) |
| Q8 | Strength of desired outcome | 10 (exhausted, wants this resolved permanently) |
| Q9 | Readiness / objection level | 10 (no hesitation, ready to start) |

**Maximum possible score:** 50 points (5 questions x 10 max)

---

## Data Types

### QuizOption

```typescript
interface QuizOption {
    id: string;              // "A", "B", "C", "D"
    text: string;            // Arabic answer text
    score: ScoreType;        // 'IG' | 'OG' | 'Both' | 'Neutral'
    qualifyingScore?: number; // 0-10, only set on Q5-Q9
}
```

### QuizQuestion

```typescript
interface QuizQuestion {
    id: number;              // 1-9
    text: string;            // Arabic question text
    options: QuizOption[];   // 4 options per question
}
```

---

## Qualifying Tier Calculation

### Function

**File:** `apps/web/src/lib/quiz-data.ts`

```typescript
export function computeQualifyingTierFromQuiz(answers: Record<number, string>): {
    tier: QuizQualifyingTier;
    score: number;
} {
    let total = 0;
    for (const question of quizQuestions) {
        const answerId = answers[question.id];
        if (!answerId) continue;
        const option = question.options.find((o) => o.id === answerId);
        if (!option?.qualifyingScore) continue; // Q1-Q4 have no qualifyingScore
        total += option.qualifyingScore;
    }
    // Apply thresholds
    if (total >= 38) return { tier: 'high', score: total };
    if (total >= 28) return { tier: 'medium', score: total };
    return { tier: 'low', score: total };
}
```

### Thresholds

| Tier | Score Range | Meaning |
|---|---|---|
| **HIGH** | >= 38 out of 50 | Ready to buy. High urgency, strong intent signals |
| **MEDIUM** | 28-37 out of 50 | Interested but needs guidance. Moderate urgency |
| **LOW** | < 28 out of 50 | Just exploring. Low urgency, needs nurturing |

### Threshold Design Rationale

- **38/50 = 76%** for HIGH — requires strong "yes" answers on at least 4 of 5 qualifying questions
- **28/50 = 56%** for MEDIUM — allows some hesitation but still shows engagement
- Below 28 captures truly cold leads who chose cautious/uncertain answers throughout

---

## Tier Routing

### HIGH Tier (>= 38)

| Action | Timing | Channel |
|---|---|---|
| WhatsApp consultation CTA on results page | Immediate | Results page UI |
| Sales team Telegram alert | Immediate | Telegram bot |
| Hot lead task created in CRM | Immediate | `salesTasks` collection |
| 5-minute SLA for first human contact | 5 min max | Sales team |
| Discount timer displayed on results page | Immediate | Results page UI |
| Meta CAPI `qualifying_completed` event fired | Immediate | Server-side |
| Sequence enrollment: high-tier follow-up | Immediate | `triggerQualifyingTier()` |

### MEDIUM Tier (28-37)

| Action | Timing | Channel |
|---|---|---|
| WhatsApp CTA on results page (softer) | Immediate | Results page UI |
| Entry offer promotion on results page | Immediate | Results page UI |
| Discount timer with softer urgency | Immediate | Results page UI |
| Meta CAPI `qualifying_completed` event fired | Immediate | Server-side |
| Sequence enrollment: medium-tier follow-up | Immediate | `triggerQualifyingTier()` |
| Standard follow-up within 24 hours | 24 hours | Sales team |

### LOW Tier (< 28)

| Action | Timing | Channel |
|---|---|---|
| Email nurture sequence only | Immediate enrollment | Email |
| No timer on results page | N/A | Results page UI |
| No Meta CAPI qualifying event | N/A | Skipped |
| Content-based re-engagement | Weekly | Email |

---

## Data Model

### Lead Document Fields

These fields are written to the lead document in Firestore by `/api/quiz-complete`:

| Field | Type | Description |
|---|---|---|
| `qualifyingTier` | `'high' \| 'medium' \| 'low'` | Computed qualifying tier |
| `qualifyingScore` | `number` | Raw score 0-50 from Q5-Q9 |
| `qualifyingSource` | `'unified_quiz'` | Always this value (distinguishes from legacy inline qualifying) |
| `qualifiedAt` | `Timestamp` | When the tier was computed |
| `quizAnswers` | `Record<number, string>` | Map of questionId (1-9) -> answerId (A/B/C/D) |
| `quizProfile` | `ProfileType` | Behavioral persona: `emotional_eater`, `overwhelmed_juggler`, `cycle_breaker` |
| `quizScores` | `{ ig: number, og: number }` | Raw behavioral scores |
| `quizType` | `string` | Quiz variant identifier (e.g., `dress_challenge`, `mental_bariatric`) |
| `quizCompletedAt` | `Timestamp` | When the quiz was submitted |

### Legacy Fields (Backward Compatibility)

| Field | Notes |
|---|---|
| `qualifyingAnswers` | Old inline micro-qualify answers. May be empty for new leads. Kept for leads created before unified quiz. |
| `profile_type` | Legacy alias for `quizProfile`. Scoring system reads both. |

---

## Quiz Completion API Flow

**Endpoint:** `POST /api/quiz-complete`
**Key file:** `apps/web/src/app/api/quiz-complete/route.ts`

### Request Body

```typescript
{
    firstName: string;
    email: string;
    whatsapp?: string;
    scores: { ig: number, og: number };
    profile: string;
    answers: Record<number, string>;   // { 1: "A", 2: "C", 3: "B", ... }
    quizType: string;
    attributionPayload?: object;
    standardAttribution?: object;
    metaBrowserData?: object;
    eventSourceUrl?: string;
    eventId?: string;
}
```

### Processing Steps

1. **Validate** — email format, required fields
2. **Normalize lead ID** — `email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')`
3. **Capture anonId** — read `tsg_anon` cookie from request headers for event stitching
4. **Compute qualifying tier** — `computeQualifyingTierFromQuiz(answers)`
5. **Generate discount code** — unique per lead, with configurable expiry
6. **Write to Firestore** — create/update lead document with all quiz + qualifying data
7. **Send quiz results email** — Resend with profile name, discount code, checkout link
8. **Push to Systeme.io** — external email marketing sync
9. **Trigger CRM sequences** — `triggerSequenceEnrollment()` for status-change sequences
10. **Trigger tier sequences** — `triggerQualifyingTier()` for tier-specific sequences
11. **Fire Meta CAPI Lead event** — for all leads
12. **Fire Meta CAPI qualifying_completed** — for HIGH and MEDIUM only
13. **Return to client** — `{ leadId, discountCode, discountPercent, discountExpiresAt, qualifyingTier, qualifyingScore }`

### Response

```typescript
{
    success: true,
    leadId: string,
    discountCode: string,
    discountPercent: number,
    discountExpiresAt: string,  // ISO date
    qualifyingTier: "high" | "medium" | "low",
    qualifyingScore: number,
}
```

---

## Admin UI: Qualifying Tier Visibility

### Where Tier Appears

| Admin View | What Shows |
|---|---|
| **Leads list** (`/admin/leads`) | التأهيل column + filter dropdown to filter by tier |
| **Lead drawer** (slide-out panel) | Full section with tier badge, score, Q5-Q9 answer breakdown |
| **Lead detail** (`/admin/leads/[id]`) | Detailed calculation showing each Q5-Q9 answer + points earned |
| **Hot leads queue** (`/admin/hot-leads`) | Tier badge next to lead score |
| **CRM pipeline** (`/admin/crm/pipeline`) | Tier badge on kanban cards |
| **WhatsApp inbox** (`/admin/whatsapp`) | Tier badge in conversation list + Q5-Q9 breakdown in lead modal |

### Tier Display Conventions

| Tier | Arabic Label | Emoji | Color |
|---|---|---|---|
| HIGH | عالي | fire | Red |
| MEDIUM | متوسط | sparkles | Amber |
| LOW | منخفض | seedling | Green |

### QualifyingTierExplanation Component

Shows the actual calculation transparently:
- Lists each Q5-Q9 question with the user's selected answer
- Shows points earned per question (out of max 10)
- Visual progress bar per question
- Total score with tier threshold explanation
- Also shows IG/OG behavioral score for each answer

---

## Adapting for a New Client

### Step 1 — Define the quiz questions

Rewrite `quiz-data.ts` with domain-specific Q1-Q4 (behavioral) and Q5-Q9 (qualifying) questions. Keep the same scoring structure:

- Q1-Q4: `score: 'IG' | 'OG' | 'Both' | 'Neutral'` only, no `qualifyingScore`
- Q5-Q9: `score` + `qualifyingScore: 0-10`

### Step 2 — Adjust profiles

Replace `emotional_eater`, `overwhelmed_juggler`, `cycle_breaker` with client-specific personas. Update `getProfile()` thresholds if needed.

### Step 3 — Calibrate thresholds

Start with 38/28 thresholds. After initial data (100+ leads), analyze conversion rates per tier and adjust:
- If too many leads are HIGH but don't convert -> raise HIGH threshold
- If too few leads are HIGH -> lower it

### Step 4 — Configure tier routing

Set up sequences in the CRM for each tier with appropriate timing and channels. At minimum:
- HIGH: instant WhatsApp + call within 5 min
- MEDIUM: WhatsApp within 24 hours
- LOW: email-only nurture sequence

### Step 5 — Build results page variants

The results page should render differently per tier:
- HIGH: prominent WhatsApp CTA, countdown timer, urgency messaging
- MEDIUM: WhatsApp CTA + entry offer, moderate urgency
- LOW: educational content, email-based next steps, no timer
