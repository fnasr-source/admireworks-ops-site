# Reference System: Edrak Space

Use this reference when building webinar, WhatsApp, AI reply, and admin-led follow-up systems.

## Best-Reuse Takeaways

### Funnel Architecture
- ad traffic goes to a webinar or registration page
- registration triggers WhatsApp and email confirmation
- reminder flow supports show-up and replay consumption
- post-event sales follow-up uses WhatsApp, email, and human handoff
- payment follow-up and onboarding continue after conversion

Working pattern:
- traffic -> webinar landing -> registration -> confirmation -> reminders -> webinar or replay -> sales follow-up -> payment follow-up -> onboarding

### Landing Page Patterns
- clear promise and transformation headline
- authority and story before the long-form sell
- short form capture above the fold
- objection handling and proof near the CTA
- separate post-registration pages for follow-up and replay logic

### Automation And Messaging
- WhatsApp confirmations and reminders are runtime-managed
- AI replies cover simple inbound messages while human handoff handles uncertainty
- conversation state, queue state, and delivery logs are all explicit
- retargeting and reminders follow event timing, not only page visits

### Admin Area Patterns
- dedicated WhatsApp inbox
- messaging cockpit and QA routes
- explicit statuses for active, needs review, and done
- separate health monitoring for queue, handoffs, templates, and permissions

## Existing Internal AW SOP Paths

The Edrak reference is also scattered today. These are the exact places where related assets currently live inside `Internal AW SOP`:

| Asset | Path |
|---|---|
| Proposal | `clients/Edrak/Proposal_v1.md` |
| Research report | `clients/Edrak/Research_Report.md` |
| Strategic report | `clients/Edrak/Strategic_Market_Report.html` |
| Legacy proposal registry link map | `ops/proposal-system/legacy-proposals.json` |
| Reuse reference note | `clients/Basseqat/kb/project/SOURCE_PATTERN.md` |
| WhatsApp and admin pattern note | `clients/Basseqat/kb/project/PROJECT_PROFILE.md` |
| Contamination guard note | `clients/Basseqat/research/CONTAMINATION_CHECKLIST.md` |

## Live Runtime Lessons Captured In This Pass

The strong runtime implementation lives in the sibling Edrak Space app repo, while `Internal AW SOP` stores the strategic and proposal layer.

The verified operational lessons to reuse are:
- inbound messages can appear in admin even when AI replies are disabled
- `appConfig/aiReply.enabled` must be checked before assuming the transport is broken
- `conversationState`, `aiReplyQueue`, and `messageLogs` are the minimum runtime trail for debugging
- live QA must confirm the user actually receives the outbound reply, not only that the admin log exists

Verified on staging on 2026-03-19:
- AI replies were not being sent because `appConfig/aiReply.enabled` was `false`
- after re-enabling AI replies, a real inbound WhatsApp message was queued through `aiReplyQueue`
- the outbound AI reply was created in `messageLogs` and reached `delivered`
- messaging health was then recomputed so precampaign QA reflected current system state rather than stale backlog debt

## How To Reuse It

When adapting this system for a new client:
- use the webinar plus confirmation flow in `flows/`
- document the runtime state model in `admin/` and `sops/`
- keep delivery and queue evidence in `reports/`
- treat live messaging QA as part of launch, not as an optional afterthought

## Puck CMS Page Builder Pattern

Edrak Space migrated 25+ static pages to a Puck-based visual page builder system. This allows non-developers to edit page content through a drag-and-drop editor while keeping the design system enforced.

### Architecture

- **Framework shell:** `src/lib/builder/framework/BuilderShell.tsx` wraps Puck's editor with save status, publish controls, viewport presets, and role gating.
- **Block registry:** Each page type has its own block definition file in `src/lib/builder/blocks/`.
- **Page layouts:** Stored in Firestore, loaded at render time, edited in the builder admin.
- **Publish flow:** Admin edits in the builder, content autosaves as drafts, explicit publish action pushes to production.

### Block Types

Each page type defines its own set of blocks:

| Block File | Page Type |
|---|---|
| `about-blocks.tsx` | About Us page |
| `challenge-blocks.tsx` | 5-Day Challenge (Arabic) |
| `challenge-en-blocks.tsx` | 5-Day Challenge (English) |
| `podcast-blocks.tsx` | Podcast page |
| `quiz-blocks.tsx` | Quiz funnel |
| `webinar-v2-blocks.tsx` | Webinar variant 2 |
| `webinar-v3-blocks.tsx` | Webinar variant 3 |
| `workshop-blocks.tsx` | Workshop page |
| `program-v2-blocks.tsx` | Program sales page |

### Migration Approach

The migration from hardcoded pages to CMS-managed pages followed this lifecycle:

1. **Build** -- Create the page as a static Next.js page with hardcoded content.
2. **Archive** -- Once the page is stable, decompose it into Puck blocks with matching props.
3. **Direct** -- Seed the Firestore layout document from the static content, then route the live URL to the CMS-rendered version.

Seed scripts live in `tmp/seed-*-layout.cjs` and are used to populate the initial Firestore layout for each page.

### Role Gating

- Clients can preview pages in the builder but cannot save.
- Only admin and superadmin roles can save edits.
- Only superadmin can publish to production.

### Viewport Presets

The builder includes viewport presets matching the QA checklist from CLAUDE.md: 360px, 390px, 412px, 430px, 768px, 1280px.

---

## Bilingual AR+EN with LTR/RTL Support

Edrak Space supports both Arabic and English content with proper bidirectional text handling.

### Implementation

- The base layout sets `direction: rtl` for Arabic pages.
- English page variants (e.g., `challenge-en-blocks.tsx` vs `challenge-blocks.tsx`) use `direction: ltr`.
- The builder framework renders previews in an iframe that loads the real RTL Cairo-font tree so the preview matches the live site.

### Bilingual Patterns

| Pattern | Arabic | English |
|---|---|---|
| 5-Day Challenge | `/5-day-challenge` | `/5-day-challenge-en` |
| Money Blocks Detox | `/money-blocks-detox-v2` | `/money-blocks-detox-en-v2` |
| Program page | `/money-blocks-detox-program-v2` | `/money-blocks-detox-program-en-v2` |

Each language gets its own block definitions, layout seeds, and page routes. They share the same component library but with direction-appropriate styling.

### Typography for Bilingual

- Arabic pages: System Arabic fonts first, 1.6 line height minimum, 16px body on mobile.
- English pages: Standard Latin font stack, tighter line heights acceptable.
- Never mix heavy formal Arabic with colloquial Egyptian on the same page.

---

## Multi-Stage Funnel Architecture

Edrak Space implements a five-stage progressive funnel:

```
Homepage -> Webinar -> Workshop -> Long Program -> VIP
```

### Stage Details

| Stage | Purpose | Conversion Goal | Emotional/Practical Balance |
|---|---|---|---|
| **Homepage** | Primary entry point | Drive to webinar registration | 100% funnel entry |
| **Webinar** | Free value delivery | Attend live or watch replay | Educational + trust |
| **Workshop** | Paid entry product | Convert attendees to buyers | 60% emotional / 40% practical |
| **Long Program** | Core revenue product | Workshop grads or direct high-intent | 50% / 50% |
| **VIP** | High-ticket coaching | Qualified leads and program grads only | 70% emotional / 30% practical |

### Cross-Linking Rules

- Homepage links only to webinar registration (no competing CTAs).
- Webinar thank-you page links to workshop.
- Workshop completion emails link to long program.
- VIP is shown only to qualified leads and program graduates.

### Variant Testing

Webinar pages support A/B variants with strict governance:
- Only two variants may exist at a time (control + test).
- New variants require a written hypothesis with primary KPI and decision rule.
- The hypothesis must be added to CLAUDE.md before implementation.

---

## LOCKED Section Governance Pattern

Edrak Space's CLAUDE.md introduces a governance model where critical sections are marked as LOCKED. This is a reusable pattern for any client project where brand, messaging, or funnel rules must not be changed without explicit approval.

### How It Works

Sections in CLAUDE.md are marked with:
```
> LOCKED SECTION -- Do not modify without explicit client approval.
```

### What Gets Locked

| Section | Why It Is Locked |
|---|---|
| Brand & UI Rules | Logo usage, brand colors, typography, visual tone |
| Messaging Rules | Target audience, language rules, priority ladder, forbidden wording |
| Webinar Naming | The exact webinar name -- never paraphrase or translate |
| Webinar Landing Pages | Active variants and the hypothesis required for new ones |
| Homepage Rules | Structure and CTA focus |
| Workshop/Program/VIP Pages | Conversion purpose and emotional/practical balance |
| Thank You Page Rules | Required elements and allowed next CTAs |
| Media & Proof Rules | Hero images, testimonials, video embeds |
| Tracking & Attribution | UTM standards, persistence, lead storage |
| Deployment Rules | Hosting, branch, domain |

### Approval Authority Matrix

| Change Type | Approval Required From |
|---|---|
| Any LOCKED section modification | Client |
| Non-LOCKED copy changes | Project Lead |
| New page creation | Client |
| A/B test variants | Project Lead + Client |
| Production deployment | Project Lead |
| Emergency rollback | Project Lead |

### Applying This Pattern to Other Clients

1. Identify which brand, messaging, and funnel rules the client considers non-negotiable.
2. Mark those sections as LOCKED in the project's CLAUDE.md.
3. Define the approval authority matrix (who can approve changes to what).
4. Enforce the change protocol: update CLAUDE.md first, then update pages. Never change pages without updating the rules document.

---

## Webinar Decomposition into Per-Section Blocks

The webinar page was decomposed into 14 individual Puck blocks, each representing a distinct section of the webinar landing page. This approach allows content editors to reorder, hide, or duplicate sections without touching code.

### Block Architecture (Webinar v2)

The webinar v2 block file (`webinar-v2-blocks.tsx`) defines discrete, self-contained sections:

1. Hero with headline and registration CTA
2. Problem agitation (pain points)
3. Founder credibility and authority
4. Webinar agenda/what you will learn
5. Social proof (testimonials)
6. Results and transformations
7. Who this is for (audience qualifier)
8. Who this is NOT for (negative qualifier)
9. Bonus content tease
10. Registration form (repeated CTA)
11. FAQ/objection handling
12. Urgency and scarcity
13. Final CTA with guarantee
14. Footer with legal and contact

Each block receives its own props and can be independently edited in the builder. The seed script (`tmp/seed-webinar-v2-layout.cjs`) populates the initial content from the static page.

### Reuse for Other Clients

When building a new webinar page for a different client:
1. Copy the block definitions as a starting template.
2. Replace the content and brand tokens.
3. Seed the layout from the new client's copy.
4. Use the builder to iterate without developer involvement.

---

## Content CMS Lifecycle: Build -> Archive -> Direct

The three-phase lifecycle for Edrak Space pages:

### Phase 1: Build

Create the page as a standard Next.js page component with hardcoded content. This is the fastest way to get a page live and iterate on copy/design with the client.

### Phase 2: Archive

Once the page content is approved and stable:
1. Decompose the page into Puck blocks with matching props.
2. Create a seed script that converts the static content to a Puck layout JSON.
3. Run the seed script to populate Firestore.
4. Test the CMS-rendered version against the static version.

### Phase 3: Direct

Switch the live URL to serve the CMS-rendered version:
1. The page route loads the layout from Firestore.
2. The Puck renderer assembles the blocks.
3. Content editors can now modify pages through the builder admin.
4. The static page file can be removed or kept as a reference.

This lifecycle means every page starts fast (hardcoded) and graduates to CMS-managed once the content is locked. It avoids the overhead of building in the CMS from day one when content is still changing rapidly.

---

## Current Gap Closed Here

Before this pass, Edrak-related strategy files existed in the repo but the strongest operational lessons lived outside it and were not tied back into the SOP system. This reference doc closes that gap and makes the reusable admin and messaging model explicit. The additions above document the Puck CMS migration, bilingual support, funnel architecture, governance model, and content lifecycle that were previously only discoverable by reading the project source.

