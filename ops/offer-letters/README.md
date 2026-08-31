# Offer letters

Rebuilt 2026-08-08 from the REAL letters in the owner's Drive and the real
cover emails in his sent mail. There is **no `template.docx` dependency**: the
generator builds the document from scratch, so the template can never go
missing again.

## Layout

| Asset | Purpose |
|---|---|
| `letter-structure.md` | The letter's skeleton and every FIXED string, verbatim. The source of truth. |
| `cover-email.md` | The offer email, verbatim, incl. who sends it and the real signature block. |
| `duty-libraries/{family}.md` | The numbered duty sections per role family. Two are real (`account-manager`, `content-manager`); the rest are stubs the generator refuses to use. |
| `bonus-structures.md` | The bonus block's shape + the one real example, with its real figures. |
| `engagement-templates.md` | The engagement clause variants, verbatim. |
| `build-offer.py` | Generates the `.docx`. No template needed. |
| `past-offers/` | Archive + `past-offers.md` log. |

## Usage

Two ways in.

**From the portal (preferred).** Open a candidate at
`/dashboard/hiring/{candidacyId}` and press **Offer letter**. It pre-fills the
config from the candidate record and copies it to your clipboard, then tells you
the one command to run. Route: `GET /api/hiring/candidacies/{id}/offer-letter`.

**By hand.**
```bash
cd "ops/offer-letters"
python3 build-offer.py --print-schema      # the config shape
python3 build-offer.py --config offer.json --output ~/Desktop/
```
Requires `python-docx` (`pip3 install python-docx`).

## What the generator will NOT do for you

These are commitments, so they are never auto-filled. The portal reports each
as a gap with the reason:

- **`start_date`**: take it from the LAST message in the negotiation thread,
  not the first offer. Start dates drift (Sally Tarek's moved 17 May to 1 June).
- **`base_salary`**: enter the AGREED figure as it should read in the letter.
- **`engagement_clause`**: full-time and part-time-converting are structurally
  different commitments; copy the right variant verbatim.
- **`bonus_block`**: omit it entirely when there is no bonus. When there is,
  copy the shape and supply the negotiated numbers; the example figures belong
  to one past hire.
- **A role family with no approved duty library**: derive one from the closest
  existing library plus the offer email's "What you'll own" bullets, get it
  approved, and save it. The generator hard-fails on a stub rather than shipping
  someone else's duties.

## Two traps worth knowing

**Entity drift.** The Drive file NAMED "[Offer Letter template]" carries the
legacy **ADMIRE8 MARKETING MANAGEMENT L.L.C** letterhead (Office C23, PO Box
31787, admire8.com). Both 2026 letters use **Admireworks Advertising LLC** (A2
Office 522, PO Box 125033, admireworks.com), which is what this generator emits.
Do not "restore" the file whose name says template.

**This is not an employment contract.** No real letter has a probation,
working-hours, leave, confidentiality, notice-period, termination or IP clause.
It is deliberately short-form. Do not add them.

## Fidelity check

The generator was validated by regenerating the real Sally Tarek letter
(2026-05-16) and comparing against what was sent: both date formats
(bare-numeral at the top, ordinal for the start date), the verbatim opening with
its comma splice, the en-dash bonus ladder, all 9 duty sections, and the closing
and signature block all match.

What is NOT reproduced from the Word original: the embedded logo image and the
exact brand fonts (Jaymont / Akkurat Pro are not installed on most machines, so
Word would substitute silently). Brand navy is applied to the headings instead.
If you want the logo, paste it into the generated file once and save that as
your own starting point, or hand the .docx to design.

## Sending

The generator produces a document and a draft. **A human sends it.** Never
auto-send an offer.
