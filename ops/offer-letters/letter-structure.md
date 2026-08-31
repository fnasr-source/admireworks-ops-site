# The Admireworks offer letter: verbatim structure

Extracted 2026-08-08 from the REAL letters in Drive, replacing the
2026-08-07 reconstruction that was derived from the skill's prose and did not
match reality. Sources:

| Doc | Drive id | Date | Entity |
|---|---|---|---|
| Account Manager, Sally Tarek (**canonical**) | `1qFk03Miz347sfzZZISJv8BKITVbRZMLE` | 2026-05-16 | Admireworks Advertising LLC |
| Founding Content Manager, Nour @ Mond | `1Dqg268UGR5gdbmMOwXcAqWX6kLaFVgiO` | 2026-05-10 | Admireworks Advertising LLC |
| "[Offer Letter template]" (**do not use, see warning**) | `15fG0yJeBhlP8OZk_HaM9gXL5cS7ubFzw` | body dated 2024-09-22 | ADMIRE8 MARKETING MANAGEMENT L.L.C |

## WARNING: entity drift

The Drive file whose NAME says "[Offer Letter template]" carries the **ADMIRE8
MARKETING MANAGEMENT L.L.C** letterhead (Office C23, PO Box 31787,
admire8.com). Both 2026 letters use **Admireworks Advertising LLC** (A2 Office
522, PO Box 125033, admireworks.com). Rebuilding from the file named "template"
emits offers under the wrong legal entity. The canonical source is the Sally
Tarek letter.

## What this letter is NOT

There is no probation, working-hours, annual-leave, confidentiality,
notice-period, termination or IP-assignment clause in any real letter. This is
a deliberately short-form offer letter, not an employment contract. Do not
invent those sections.

## Skeleton, in order

1. Letterhead table (2 columns, centred, Arabic left / English right)
2. Letter date, bare-numeral format: `16 May 2026`
3. `Dear {first_name},`
4. Opening paragraph (fixed)
5. Engagement clause (variable; absent in older letters)
6. `Compensation` heading + salary sentence
7. Bonus block (optional)
8. `Start date` heading + sentence, ORDINAL format: `1st of June 2026`
9. `JOB DUTIES AND RESPONSIBILITIES` + lead-in
10. 9 numbered duty sections (section 9 is a fixed frame)
11. Closing block (fixed)
12. Signature block (fixed)

Note the TWO date formats: bare-numeral at the top, ordinal for the start date.

## Verbatim fixed text

### Letterhead, Arabic (left cell)
```
ادميري وركس للإعلان (ش.ذ.م.م)
أم هرير ٢، شارع مستشفى راشد
جلف تاورز، جناح A2 مكتب ٥٢٢
ص.ب.، ١٢٥٠٣٣ ، دبي
الإمارات العربية المتحدة
```
Eastern Arabic-Indic numerals, Latin suite codes (`A2`). The PO Box line's
spacing (`ص.ب.، ١٢٥٠٣٣ ، دبي`) is idiosyncratic in the original; keep it.

### Letterhead, English (right cell)
```
Admireworks Advertising LLC
Umm hurair 2, Rashid Hospital Street
Gulf Towers, A2, Office 522
PO Box 125033, Dubai
United Arab Emirates
admireworks.com
```
NO phone and NO email appear in the letterhead of any real letter, despite both
existing in the org record. Do not add them.

### Opening paragraph
```
We are pleased to offer you the position of {role_title} with Admireworks, you'll be expected to report directly to our {reports_to_title}, Mr. Fouad Nasseredin.
```
The comma splice after "Admireworks" is verbatim in all three letters. Keep it.

### Compensation
```
Compensation

The starting salary for this position will be {base_salary}.
```
When a bonus block follows, the sentence ends with a colon instead:
`... will be 20,000 EGP per month, plus a performance bonus tied directly to client outcomes:`

### Start date
```
Start date

Your official date of hire is {start_date}.
```

### Duties heading + lead-in
```
JOB DUTIES AND RESPONSIBILITIES

The {role_title} will be responsible for the following:
```

### Closing block (byte-identical in all three letters)
```
This offer is contingent upon a satisfactory background check and reference check.

If you choose to accept this offer, please sign and date this letter and return it to me at your earliest convenience.

We are excited about the potential of you joining our team and believe that Admireworks will provide a professional opportunity that is in line with your skills and expertise.

Thank you for considering this offer. We look forward to your positive response.

Best Regards,

Fouad Nasseredin

Managing Partner Signature / Date

Admireworks
```
`Managing Partner Signature / Date` is ONE line: "Managing Partner" is Fouad's
title, "Signature / Date" is the countersign prompt. Do not split it. There is
no separate candidate signature block; the candidate countersigns on that line.

## Duty-section conventions (the 2026 generation)

- Exactly 9 numbered sections, `N. Title Case Heading`.
- 2 to 4 sub-bullets each, sentence case, NO terminal period.
- Written as OWNERSHIP statements, not capability statements. (The 2024
  generation used capability statements ending in periods; that style is
  superseded.)
- **Section 9 is a fixed frame**, the only templatable duty section:
  ```
  9. Other Responsibilities

  Perform additional {domain} duties as reasonably required to support the growth of {entity}
  Participate in weekly one-on-one meetings with {the Managing Partner|Mr. Fouad} to align on priorities and discuss strategic direction
  ```

## Never templated (one-off negotiated terms)

1. Nour's supersession clause (part-time converting to full-time under a
   separate agreement).
2. Sally's entire bonus schedule: the figures are negotiated per hire. Template
   the SHAPE, force the operator to supply the NUMBERS.
3. Sally's post-year-one compensation-review sentence: a soft commitment with
   real consequences. Opt-in only.
4. The `(at Mond)` entity qualifier in a role title: cross-entity hires only.
5. MOND-specific proprietary references (Nano Diamond Method, 4 Cs Framework,
   @mond.hq, MOND Score).
6. `Sunday through Thursday` Cairo working week: correct for Egypt, wrong for a
   Dubai or remote hire.
