# Discovery Input Checklist

**Purpose:** Run this checklist before starting any strategy generation for a client.
If any item is missing, produce a gap analysis with specific questions for the client or team — do not generate strategy with incomplete inputs.

---

## How to Use

Before generating strategy (direct-response, offer architecture, ad creative, or email sequences), check each item below. For any item marked **Missing**, add a question to `clients/{Client-Slug}/active_state/blockers.md` and ask the client or account manager before proceeding.

---

## 1. Client Brief

| # | Item | Status |
|---|---|---|
| 1.1 | Onboarding brief / questionnaire completed | ☐ Present · ☐ Missing |
| 1.2 | Company and brand overview captured | ☐ Present · ☐ Missing |
| 1.3 | Primary offer described (product/service, price, positioning) | ☐ Present · ☐ Missing |
| 1.4 | Target audience defined (demographics, psychographics, pain points) | ☐ Present · ☐ Missing |
| 1.5 | USP articulated (why them vs. competitors) | ☐ Present · ☐ Missing |
| 1.6 | Business goals stated (revenue, leads, signups, etc.) | ☐ Present · ☐ Missing |
| 1.7 | Gap analysis against questionnaire completed | ☐ Present · ☐ Missing |

**Minimum to proceed to strategy:** 1.1 + 1.3 + 1.4 + 1.5

---

## 2. Meeting Intelligence

| # | Item | Status |
|---|---|---|
| 2.1 | At least one discovery call transcript on file | ☐ Present · ☐ Missing |
| 2.2 | Key decisions and blockers extracted to `active_state/` | ☐ Present · ☐ Missing |
| 2.3 | Client tone, vocabulary, and objections noted in `kb/` | ☐ Present · ☐ Missing |

**Minimum to proceed:** 2.1

---

## 3. Market Research

| # | Item | Status |
|---|---|---|
| 3.1 | Competitor scan completed (min. 3 competitors) | ☐ Present · ☐ Missing |
| 3.2 | Market positioning mapped | ☐ Present · ☐ Missing |
| 3.3 | Any existing research reports or data stored in `research/` | ☐ Present · ☐ Missing |

**Minimum to proceed:** 3.1

---

## 4. Brand & Creative Assets

| # | Item | Status |
|---|---|---|
| 4.1 | Logo file or link captured | ☐ Present · ☐ Explicit "none" · ☐ Missing |
| 4.2 | Brand color palette noted | ☐ Present · ☐ Explicit "none" · ☐ Missing |
| 4.3 | Tone of voice described or inferred | ☐ Present · ☐ Missing |
| 4.4 | Testimonials / social proof on file or linked | ☐ Present · ☐ Explicit "none" · ☐ Missing |
| 4.5 | Existing creative samples (ads, landing pages) referenced | ☐ Present · ☐ Explicit "none" · ☐ Missing |

**Minimum to proceed:** 4.3 (tone of voice is non-negotiable for copy)

---

## 5. Offer & Funnel Context

| # | Item | Status |
|---|---|---|
| 5.1 | Core offer price point confirmed | ☐ Present · ☐ Missing |
| 5.2 | Traffic channels agreed upon | ☐ Present · ☐ Missing |
| 5.3 | Existing funnel described or diagrammed | ☐ Present · ☐ Explicit "new build" · ☐ Missing |
| 5.4 | Admin workflow (how leads are handled after opt-in) defined | ☐ Present · ☐ Missing |

**Minimum to proceed:** 5.1 + 5.2

---

## 6. Technical Architecture Inputs

| # | Item | Status |
|---|---|---|
| 6.1 | Preferred payment provider confirmed (PayMob / Stripe / both) | ☐ PayMob only · ☐ Stripe only · ☐ Both · ☐ Missing |
| 6.2 | Quiz / lead qualification needed (yes/no, approximate question count) | ☐ Yes (__ questions) · ☐ No · ☐ Missing |
| 6.3 | CRM tier definitions agreed (hot/warm/cold thresholds and SLA per tier) | ☐ Present · ☐ Missing |
| 6.4 | Analytics platforms available (GA4 property ID, Clarity project ID, Meta pixel ID) | ☐ GA4: ☐ · Clarity: ☐ · Meta Pixel: ☐ · ☐ Missing |
| 6.5 | Email domain ready for Resend verification (DNS access confirmed) | ☐ Ready · ☐ Not ready · ☐ Missing |

**Minimum to proceed to tech setup:** 6.1 + 6.5

---

## Gap Analysis Protocol

If items are missing, use this template in `active_state/blockers.md`:

```markdown
## Missing Inputs — [Client Name] — [Date]

### Blockers Before Strategy Generation
- [ ] **[Item #]**: [What is missing] — *Question for client:* "[Specific question to ask]"

### Next Action
- [ ] Send questions to [Contact Name] via [WhatsApp / Email / Portal thread]
- [ ] Follow up by [Date]
```

---

## Reference Systems

Once inputs are complete, check if a reference system exists for this client's funnel type:
- **Quiz / lead-gen funnels** → `ops/direct-response-playbook/reference-systems/the-slim-game.md`
- **Webinar / high-ticket funnels** → `ops/direct-response-playbook/reference-systems/edrak-space.md`
- **Other client types** → Check `ops/direct-response-playbook/reference-systems/` for new additions
