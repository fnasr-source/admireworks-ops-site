# Reference System: IntentOS

IntentOS is an "Operating System for Intent-Based Growth" -- a B2B outreach platform that ingests leads, scores them, enriches contact data via Apollo, generates personalized outreach drafts via Google Generative AI, and sends campaigns via Instantly.ai. It is the reference implementation for server-action-first architecture, pipeline orchestration, and RBAC with organization hierarchy.

**Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Firebase/Firestore, Server Actions, iron-session.

**Repo:** `fnasr-source/IntentOS` (branch: `main`)

---

## Server Actions Pattern (Zero API Routes)

IntentOS uses **no traditional API routes**. All backend logic is implemented as Server Actions in `src/actions/`:

| Action File | Responsibility |
|---|---|
| `auth.ts` | Login/logout, session management, org switching |
| `app-actions.ts` | CRUD for workspaces, objectives, requests |
| `ingestion-actions.ts` | File upload, CSV parsing, smart column mapping |
| `enrichment-actions.ts` | Apollo contact search and email reveal |
| `draft-actions.ts` | AI message generation, review queue |
| `sending-actions.ts` | Instantly.ai campaign creation |
| `scoring-actions.ts` | Lead qualification pipeline |
| `billing-actions.ts` | Unlock credit system |
| `org-actions.ts` | Organization and member management |
| `platform-admin-actions.ts` | Admin operations, kill-switches |

Every action file uses `"use server"` at the top. Authentication is enforced via helper functions:

- `requireAuth()` -- Redirect if not logged in
- `requireOrgAccess(orgId)` -- Verify org membership
- `requireRole(orgId, minRole)` -- Check role hierarchy

### Why This Pattern

- No API route files to maintain. All server logic is co-located with the feature it serves.
- Type safety end-to-end -- the action's parameter and return types are shared between client and server.
- Authentication is enforced at the action level, not via middleware route matching.

### When to Use This Pattern

Use Server Actions when:
- The client app is Next.js 14+ with App Router
- All backend calls originate from the app's own UI (no external webhook consumers)
- You want to avoid writing separate API route handlers

Use traditional API routes when:
- External services need to call your endpoints (webhooks, third-party integrations)
- You need long-running streaming responses
- You need to expose a public API

---

## Apollo Integration for B2B Lead Enrichment

IntentOS integrates with Apollo.io for B2B contact data enrichment. The integration lives in `src/lib/enrichment/apollo/`.

### Files

| File | Purpose |
|---|---|
| `apollo-client.ts` | HTTP client wrapping Apollo's REST API with retry and rate-limit handling |
| `apollo-provider.ts` | Factory that creates an ApolloClient from org integration settings |
| `role-mapper.ts` | Maps Apollo seniority/title data to internal role categories |

### Key Operations

1. **Contact Search** -- Given a company domain and title/seniority filters, search Apollo for matching contacts.
2. **Email Reveal** -- Given an Apollo person ID, reveal their verified email address. This consumes one unlock credit per reveal.
3. **Rate Limiting** -- The client implements exponential backoff for 429 responses with up to 3 retry attempts.

### Authentication

Apollo API uses `X-Api-Key` header authentication. The API key is stored per-organization in Firestore at `organizations/{orgId}/integration_settings`.

### Credit System

Each email reveal consumes one "unlock credit" from the organization's wallet. The wallet is tracked in Firestore and enforced before every reveal call. Credits are purchased via the billing system.

---

## Google Generative AI for Outreach Drafts

IntentOS uses Google's Gemini models to generate personalized outreach messages. The integration lives in `src/lib/drafts/`.

### Files

| File | Purpose |
|---|---|
| `ai-client.ts` | Gemini client initialization, JSON-mode response generation |
| `prompt-builder.ts` | Constructs prompts from lead data, templates, and merge tags |
| `merge-tags.ts` | Replaces template placeholders with lead-specific data |
| `validators.ts` | Validates AI output before saving to the draft queue |

### How It Works

1. The prompt builder assembles context from the lead's job record, company data, and the user's outreach template.
2. `generateJSONResponse()` calls Gemini with `responseMimeType: "application/json"` to get structured output.
3. The response is validated and saved to the `drafts` collection for human review.
4. The review queue lets users approve, edit, or reject AI-generated drafts before sending.

### Model

Currently uses `gemini-2.0-flash` for speed and cost. The API key is loaded from environment or Firebase Secret Manager.

---

## Instantly.ai for Email Campaign Sending

The sending layer lives in `src/lib/sending/instantly-client.ts`. After a draft is approved, it is sent via Instantly.ai's campaign API.

### Flow

1. User approves a draft in the review queue.
2. The sending action creates or adds to an Instantly campaign.
3. Delivery events are tracked in the `sends` collection.
4. Status is visible in the admin UI per lead.

---

## RBAC with Organization Hierarchy

IntentOS implements a multi-tenant RBAC system with four roles in a strict hierarchy:

```
owner > admin > member > viewer
```

### Role Capabilities

| Role | Capabilities |
|---|---|
| **owner** | All operations including billing, member management, org settings |
| **admin** | All operations except billing configuration |
| **member** | Read/write on assigned workspaces and objectives |
| **viewer** | Read-only access to assigned workspaces |

### Implementation

- Users belong to organizations via the `members` subcollection under `organizations/{orgId}/`.
- Role checks use `requireRole(orgId, minRole)` which verifies the calling user's role meets the minimum required.
- Organization switching is supported -- a user can belong to multiple organizations.
- Session management uses `iron-session` with encrypted cookies (`intentos_session`).

### Data Isolation

All data is scoped under `organizations/{orgId}/`:
- `Workspaces`, `Objectives`, `Requests` -- Campaign structure
- `job_records` -- Qualified leads with scores
- `contacts` -- Revealed email addresses
- `drafts`, `draft_versions` -- Outreach messages
- `sends` -- Send attempts and delivery tracking
- `integration_settings` -- API keys for Apollo/Instantly

Root-level collections (`users`, `audit_logs`, `kill_switches`) are platform-wide.

---

## Pipeline Orchestrator

The pipeline orchestrator (`src/lib/db/pipeline-orchestrator.ts`) is the central brain that coordinates the full lead lifecycle.

### Pipeline Stages

```
Ingest -> Score -> Enrich -> Draft -> Send
```

| Stage | Module | What Happens |
|---|---|---|
| **Ingest** | `src/lib/ingestion/` | Upload CSV/XLSX, parse, smart map columns, normalize to `IngestedRecord` |
| **Score** | `src/lib/scoring/` | Apply weighted rules, deduplicate, decide: qualified / rejected / needs_review |
| **Enrich** | `src/lib/enrichment/` | Apollo contact search, email reveal, consume unlock credits |
| **Draft** | `src/lib/drafts/` | AI generates personalized outreach, human review queue |
| **Send** | `src/lib/sending/` | Instantly.ai campaign creation, delivery tracking |

### Orchestration Pattern

The `PipelineOrchestrator.ingestBatch()` method coordinates the full flow:

1. Process the uploaded request (normalization and smart mapping).
2. Trigger async enrichment for newly qualified leads.
3. Enrichment runs sequentially with polite delays for large batches (1-second spacing for batches >5).
4. Each lead is enriched independently -- failures on one do not block others.

### Scoring Engine

The scoring engine (`src/lib/scoring/`) includes:
- `engine.ts` -- Weighted rule evaluation
- `dedupe.ts` -- Deduplication against existing records
- `suppression.ts` -- Suppression list checking
- `config.ts` -- Scoring weights and threshold configuration

---

## Kill-Switch System

IntentOS implements a platform-wide kill-switch system for feature flags. This allows instantly disabling critical features without a deploy.

### Configuration

Kill switches are stored in Firestore at `platformConfig/killSwitches` with this structure:

```typescript
interface KillSwitchConfig {
  sending:     { globalDisabled: boolean; disabledAt: Timestamp | null; reason: string | null };
  enrichment:  { globalDisabled: boolean; disabledAt: Timestamp | null; reason: string | null };
  drafts:      { globalDisabled: boolean; disabledAt: Timestamp | null; reason: string | null };
  ingestion:   { globalDisabled: boolean; disabledAt: Timestamp | null; reason: string | null };
}
```

### API

| Function | Purpose |
|---|---|
| `getKillSwitchConfig()` | Read current state (initializes defaults if not exists) |
| `toggleKillSwitch(feature, disabled, reason)` | Enable/disable a feature with optional reason |
| `isFeatureEnabled(feature)` | Quick boolean check before executing a pipeline stage |

### Usage Pattern

Before executing any pipeline stage, the relevant action checks `isFeatureEnabled()`:
- If disabled, the action returns early with an error message.
- The platform admin UI shows the current state and allows toggling.
- The `disabledAt` timestamp and `reason` provide audit trail for why a feature was disabled.

### When to Use Kill Switches

Add a kill switch for any feature that:
- Calls external paid APIs (Apollo, Instantly, Gemini) -- to prevent runaway costs
- Sends messages to real people -- to stop outreach if something goes wrong
- Processes bulk data -- to pause ingestion during maintenance

---

## Route Structure

| Route Group | Purpose | Auth |
|---|---|---|
| `/(marketing)` | Public pages: landing, pricing, careers, legal | None |
| `/(dashboard)/app` | Protected workspace | Requires auth |
| `/(dashboard)/platform-admin` | Platform admin panel | Requires admin UID |
| `/auth` | Sign-in/sign-up flows | None |
| `/onboarding` | Post-signup onboarding | Requires auth |

---

## Best-Reuse Takeaways

### For New B2B Projects

- Use the Server Actions pattern for projects where all calls originate from the app UI.
- Use the pipeline orchestrator pattern for any multi-stage lead processing flow.
- Implement kill switches from day one for any external API integration.

### For New B2C Direct-Response Projects

- The RBAC and organization hierarchy can be simplified to a single-tenant admin model.
- The scoring engine pattern (weighted rules + thresholds) is reusable for qualifying tier calculation.
- The AI draft generation pattern (structured prompt + JSON response + human review) applies to any AI-assisted content generation.

### For Admin Dashboards

- The review queue pattern (AI generates, human approves) is safer than fully automated sending.
- Per-organization integration settings avoid the need for shared API keys.
- Audit logs at the root level provide cross-organization visibility for platform admins.

---

## Existing Internal AW SOP Paths

| Asset | Path |
|---|---|
| IntentOS reference system | This file |
| IntentOS project CLAUDE.md | `/Users/user/Documents/IDE Projects/IntentOS/CLAUDE.md` |
| GitHub Actions monitoring | Enrolled in hourly monitoring (`fnasr-source/IntentOS`) |
