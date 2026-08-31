# Proposal build learnings: founder imagery, link previews, brand architecture

> Reusable patterns captured from the **Maison Ruby / Aurea** build (June 2026).
> Applies to any premium, founder-led client proposal. Pairs with `PLAYBOOK.md`.

## 1. Founder as the face of the brand (imagery from soft reference photos)

When the founder *is* the product (the Azza Fahmy play), put them in the deck. If
all you have is low-quality reference (meeting screenshots, a phone selfie), use a
**two-stage flow**, never a one-shot:

1. **Select** the 2 clearest, most front-facing frames.
2. **Enhance to a clean identity anchor.** Feed those frames as `--ref-image` to
   `~/.claude/skills/mond-image-pipeline/generate.mjs` with a prompt that says
   *"the exact same woman ... preserve her precise identity, do not beautify or
   alter her features."* Generate 2-3 anchors and have the client confirm which is
   most like them. You cannot judge a real person's likeness from blur, the client can.
3. **Generate the scenes from the chosen anchor** (plus one real frame for identity,
   plus the product render for product accuracy). Driving every scene off the same
   anchor keeps the face consistent across all shots.
4. **Fix stiff poses.** AI defaults to a "presenting the product at chest height"
   pose. Regenerate just that shot with explicit natural-posing direction (e.g.
   "hand resting on the bag on a console, relaxed, not presenting it").

Gotchas:
- **macOS screenshot filenames contain a narrow no-break space (U+202F)** before
  "PM". Glob the timestamp (`*10.28.51*`), never hardcode the literal filename.
- **Privacy.** Raw reference photos, the identity anchors, and unused variants are
  **gitignored and never committed** to the public Pages repo. Only the final
  stylised render(s) actually used in the deck go live. After publishing, verify
  with a 404 check on the raw-ref URL.

## 2. Link preview for WhatsApp / social

Client decks get shared on WhatsApp, so the link must look premium. Add Open Graph
+ Twitter tags to the deck `<head>` and a dedicated **1200x630 `og-image`**:
- Compose the og-image with PIL (brand background + product + wordmark + tagline).
  Keep it under ~300 KB (JPEG q86). Reference it with an **absolute https URL**.
- WhatsApp caches the preview per-URL on first share. To force a refresh after a
  later change, append `?v=2` to the URL.

## 3. Brand architecture: house + collection

Do not assume a brand name from a product/design sheet. For a founder-led brand,
**lead with the founder HOUSE name** (the founder is the moat) and treat a product
or line name as a **collection** under it (house = Maison Ruby, collection = Aurea).
**Name the project folder + URL slug after the house**, not the collection.

## 4. Egyptian-market Arabic for luxury

Run Arabic through the `arabic-copy-review` skill. For luxury, use an **elegant
Egyptian** register (natural اللي / مش / إيه لو / دلوقتي, feminine address), not
stiff MSA and not street Cairene. No em dashes (hard rule).

## 5. Never name internal tooling in a client deliverable

Strip any internal tool name (image-model names, internal product names) from
captions. A figure note should read "concept render, final imagery will feature the
actual pieces" and say nothing about how it was produced.

## 6. Offer mechanics

A founding offer lands harder with a **concrete deadline** ("start by [specific
date]") and a **partial credit** (e.g. 50%) rather than a vague "within 30 days,
full credit." Put the actual date in the deck.

## 7. Sales / prospect meetings (portal)

Meetings link only to a `clients/{id}` doc (no `leadId`). File a prospect as a
`clients` doc with `status:'prospect'`; the `/dashboard/meetings` **Sales /
Prospect** filter surfaces those (derived from client status, no schema change).
HubSpot note: **EGP is not an enabled portal currency**, so a deal's EGP amount
lives in the deal name, not the amount field.
