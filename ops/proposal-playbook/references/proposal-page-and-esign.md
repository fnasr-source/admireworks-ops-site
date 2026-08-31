# Proposal Page + E-Sign + Invoice: The Canonical Sharing Pattern

> Distilled from the Black Modesty build (AWP-EG-BMD-001, June 2026), which itself followed iVein (AWP-EG-IVN-002) and Maison Ruby. Read this BEFORE building any client-facing proposal or agreement. The corrections below were all real mistakes caught by Fouad during the Black Modesty round; do not repeat them.

## The shape of the deliverable

The client receives ONE link: a designed proposal page. Everything else (e-sign agreement, invoice, HubSpot, registry) is backend rails behind that page.

1. **The page** lives at `presentations/{client-slug}/index.html` in the repo root and publishes to **`https://ops.admireworks.com/presentations/{client-slug}/`** via `scripts/deploy.sh pages`. Clean folder URL. NEVER a `.html` path, NEVER a bare portal agreement link as the thing you share.
2. **Structure** (the iVein skeleton): brand bar, doctype label with the proposal number, cover title + sub, meta grid (prepared for / attention / issued / valid until / currency / linked invoice), then: the proposal in one line, where the client stands, what we build and run, what changes day to day (before/after table), transparent NOT-included, pricing, sign-within-7-days commitments, month-by-month timeline, terms, acceptance block with signature lines.
3. **Voice:** plain words, value first, zero jargon. The reader may be non-technical; "smart assistant" not "AI Cloud API", "one organized place" not "unified CRM". Sell outcomes, normally, without hype.
4. **Brand:** swap the CSS `:root` palette to the client's identity; keep the skeleton. Gold `#cc9f53` pairs with most premium brands.
5. **WhatsApp sharing:** full OG + Twitter tags pointing at the canonical clean URL, plus a 1200x630 og-image (PIL-composed, under 300KB) in the same folder. WhatsApp caches per-URL; bust with `?v=2` when re-sharing after changes.
6. **Bilingual (Egyptian clients):** English primary with Egyptian-Arabic echo blocks under the KEY moments only (cover line, one-liner, scope list, value takeaway, pricing, rate-lock, acceptance). Mirrored RTL styling (gold right border matching the LTR gold-left callouts), Noto Sans Arabic. Terms stay English. Gate every Arabic line through the arabic-copy-review skill (Egypt glossary): feminine/masculine address matched to the reader, western digits, "جنيه" never EGP, brand names in English script, no MSA tells, no em dashes.

## The rules Fouad corrected (hard rules now)

1. **No payment rails in the proposal.** No InstaPay handle, no bank details. Those live on the INVOICE, which is sent after acceptance through the portal's standard email + WhatsApp flow. The proposal says: "On acceptance, the invoice arrives by email and WhatsApp with everything you need to proceed." Note the word **proceed**, not "pay": forward motion, not payment pressure.
2. **Soft governing law for SMB engagements.** One calm term: good-faith discussion first, then governing law (DIFC) and the local data-protection carve-out. NO arbitration machinery (DIFC-LCIA etc.) on small engagements; it intimidates founders and the arbitration cost exceeds the contract value.
3. **The sign button must work the moment the page is shared.** If the page carries a "Review & sign online" CTA, the portal agreement must be status `sent` BEFORE the link goes out. Flipping draft to sent notifies nobody (the link is private until shared), so there is no approval reason to hold it at draft. A published page with a dead CTA is a defect. If the engagement is still internal-only, protect it by NOT publishing the page, never by leaving the button broken.
4. **Clean URL always.** `ops.admireworks.com/presentations/{slug}/`, the Maison Ruby pattern. The portal public folder serves raw `.html` paths and is not the sharing surface.

## Acceptance (three paths, all binding)

State all three in the acceptance block: (1) sign online via the e-sign page, (2) countersign and return, (3) pay Invoice #1 in full. Any one triggers kickoff the next business day.

## Backend rails checklist (do ALL of these)

- **Source of record:** `clients/{Slug}/proposal/v1.md` mirrors the page word for word.
- **Portal agreement** (`agreements` collection, standard_retainer base): bodyHtml synced word-for-word with the proposal so the page and what the client signs never diverge. Re-sync whenever the proposal changes.
- **Portal invoice** (draft until acceptance): linked via `agreementId` + `agreementSnapshot` + `proposalNumber`.
- **Registry:** append the row to `ops/proposal-system/proposal-registry.csv` (AWP-EG-{TOKEN}-{SEQ}); flip status READY_TO_SEND to SENT when it goes out.
- **HubSpot:** deal in pipeline `default`; stage `Proposal Drafted` while internal, `Agreement Sent` on send, `Agreement Signed` on signature. Put the EGP value in the DEAL NAME (this portal's currency property only supports AED); set closedate to the offer-validity date; put the proposal + e-sign links in the description.
- **Workspace:** `active_state/STATUS.md` carries the live state, next actions, and the kickoff-access checklist.

## On send (the founder sends the link personally, usually WhatsApp)

1. Flip the agreement to `sent` (sign form goes live). Verify the public page renders the form.
2. Registry row to SENT. HubSpot stage to Agreement Sent, closedate = rate-lock expiry.
3. **Create a HubSpot follow-up task** (objectType `tasks`, associated with the deal AND the contact, owner = the deal owner, due about 3 days before the validity expiry): "nudge {client} before rate-lock expiry", body carrying the proposal + e-sign links and the on-acceptance steps. This is the house follow-up mechanism (it lands in the owner's daily HubSpot task digest); prefer it over Claude-side schedules.
4. Update STATUS.md with the response window and the nudge date.

## On acceptance

1. Mark agreement signed/active (or the client signs online and it auto-activates).
2. Issue the invoice from the portal so it rides the standard email + WhatsApp delivery with the payment details.
3. HubSpot to Agreement Signed; portal client status to active; kickoff next business day.

## Verification before telling anyone it's live

- gh-pages publish completed AND a cache-busted curl of the clean URL shows the new content. The first read after publish often hits the stale CDN; re-check once with a fresh buster before concluding failure.
- og-image returns 200 under 300KB.
- The e-sign page renders the signature form (status sent) and matches the proposal text.
- Zero em dashes (hook-enforced), zero payment rails on the page, Arabic gated at 3/10 or better (target 1/10).
