# MOND Outreach Playbook (2-month sprint)

The staged outreach engine for the `mondLeads` pipeline. Goal: land MOND clients
over 8 weeks. **Nothing here auto-sends.** Fouad launches each wave; the scripts
stage and sync. Run every Arabic block through the `arabic-copy-review` skill and
every Fouad-voice asset through `fouad-voice` before launching that wave.

## Channel routing (hard rules)

| Segment | Channel | Why |
|---|---|---|
| **Diamond** (401) | Fouad, manual **WhatsApp voice note + DM** (one-click from the lead drawer, Saudi line) | Highest fit; human + voice converts 21x. Only to enriched/opted-in numbers. |
| **Gold, warm** (HubSpot Admire8/DRM/E-Book/Referral) | **Apollo sequence, warm-angle copy** | Same personal sender as cold; the warm/cold split is the ANGLE of the copy. |
| **Gold, cold** (Apollo-sourced) | **Apollo sequence, cold-angle copy** | Cold volume must NOT go through admireworks.com (reputation). |
| **Raw** (1,151) | **Apollo nurture sequence** (60-90d) | Long-horizon, automated, low-touch. |

Suppress always: `emailStatus` in {invalid, do_not_mail, unavailable, bounced}.
**Sender identity (locked by Fouad 2026-06-10): ALL MOND outreach emails are
PERSONAL emails from Fouad Nasseredin**, sent via Apollo from his personal
mailbox `fn@fnasr.com` with his personal signature auto-appended (bodies carry
no embedded sign-off). This is the documented per-instance exception to the
"Admireworks Team" rule, which still governs AW-system operational email.
Plain conversational subjects (no unicode dashes, no "X | Status" marketing style).
WhatsApp cold only to warm or already-replied numbers; STOP/opt-out honored.

## 8-week cadence

| Week | Action |
|---|---|
| W1 | Data ready (import + enrich + ads sweep). No outreach. Calibrate the diamond P0 list (diamond + running ads + has phone). |
| W2 | **Diamond wave 1**: Fouad voice-notes the P0 list, ~15-25/day, running-ads + warm first. |
| W3 | **Gold warm**: email-core low-entry-offer sequence. **Gold cold**: stage into Apollo sequence. |
| W4 | **Raw**: enroll into Apollo 60-90d nurture. Diamond wave 2 (non-P0 diamonds). |
| W5-6 | Follow-up waves; promote any replies to a call; weekly engagement sync. |
| W7-8 | Re-touch non-responders with a fresh angle; book demos; convert. |

Weekly: run `firebase/mond/sync-engagement.mjs` to pull Apollo opens/clicks/replies
onto each lead's `outreach` field and auto-flag hot leads.

---

## DIAMOND: WhatsApp (manual, Fouad)

Personalize by vertical. Lead with their business, not us. Two beats: a short text
opener, then a 30-45s voice note. Use the running-ads variant when `runningAds.meta.active`.

### Arabic (Gulf) clinic opener (text)
أهلاً دكتور [الاسم]، أنا فؤاد من Admireworks. تابعت [اسم العيادة] وعجبني شغلكم بصراحة. إحنا بنبني وندير نظام تسويق كامل للعيادات: موقع وصفحات هبوط، CRM يرتّب الحالات، رد واتساب تلقائي يردّ على المريض في ثواني، وإدارة حملات. ينفع أبعتلك فويس قصير يشرح الفكرة في دقيقة؟

### Arabic (Gulf) clinic voice-note script (~40s)
دكتور [الاسم]، الفكرة باختصار: أغلب العيادات تصرف على إعلانات بس الحالة اللي تجي تضيع، ما في حد يردّ بسرعة وما في متابعة. إحنا في MOND نبني لك ماكينة كاملة: المريض يضغط الإعلان، يوصل لصفحة سريعة، يضغط واتساب، ويجيه ردّ ذكي خلال ثواني، وكل ده يتسجّل في نظام واحد تشوف منه كل حالة. مو أدوات تتعلّمها، إحنا نبنيها ونشغّلها لك. لو حابّ، نسوي لك تجربة شهر ونوريك النتيجة قبل أي التزام. أرد عليك بالتفاصيل وقت ما يناسبك.

### Arabic running-ads bundle variant (add after opener)
وشفت إنكم شغّالين إعلانات حالياً، وهنا بالظبط بنفرق: الإعلان عندنا ما يجيب لايكات، يجيب حالات فعلية لأن اللي بعده (الصفحة، الواتساب، المتابعة) كله مبني عشان يحوّل.

### English clinic voice-note script (~40s)
Hi Dr. [Name], quick idea: most clinics spend on ads but the leads leak, no one replies fast and there's no follow-up. At MOND we build you the whole machine: the patient taps the ad, lands on a fast page, taps WhatsApp, and gets an instant smart reply, all logged in one system you can see. You don't learn tools, we build and run them for you. Happy to set up a one-month trial so you see results before any commitment.

### School variant (swap the nouns)
... للمدارس: حملات التسجيل، صفحات لكل مدرسة، CRM يرتّب استفسارات أولياء الأمور، ورد واتساب يجاوب على المقاعد والرسوم في ثواني. موسم التسجيل قرّب، وده أنسب وقت.

### Coach / consultant variant
... للمدرّبين والاستشاريين: نظام يحوّل المتابعين إلى عملاء، من الإعلان للحجز للدفع، مع متابعة تلقائية ما تخلّي ولا عميل محتمل يضيع.

---

## GOLD: low-entry offer (email + WhatsApp)

The hook is the **MOND Score** (free marketing diagnostic) or a low-entry audit.
Warm golds get it from Admireworks; cold golds via Apollo.

### Warm gold email (from @admireworks)
Subject (AR): فكرة سريعة لتسويق [الشركة]
Subject (EN): A quick idea for [Company]'s marketing

Body (AR):
أهلاً [الاسم]، إنت تفاعلت معنا قبل كده في [Admire8 / ويبينار]، فحبّيت أبعتلك حاجة عملية. عملنا أداة بسيطة اسمها "MOND Score" بتطلعلك في 3 دقايق وين تسرّب الفلوس في تسويقك (من الإعلان لحد متابعة العميل). لو حابّ، أبعتلك الرابط وتشوف نتيجتك، ولو في فجوة واضحة نقعد مكالمة قصيرة. يهمّك؟
فريق Admireworks

### Cold gold email (Apollo sequence, 3 touches)
- T1 subject: سؤال سريع عن [الشركة] / Quick question about [Company]
  Body: one line on a specific gap for their vertical + the MOND Score link. Soft CTA.
- T2 (+3d): a 2-line case angle ("a clinic like yours went from leads to booked patients"). 
- T3 (+5d): direct but light: "worth a 15-min look?" + Calendly.

### Gold WhatsApp (short)
أهلاً [الاسم]، فؤاد من Admireworks. عندنا أداة بتحسب "MOND Score" لتسويق [الشركة] وتوريك وين بتضيع العملاء. أبعتهالك؟

---

## RAW: 60-90d Apollo nurture (value-first, no pressure)

- Wk1-2: education tied to their likely gap (the 4 Cs: capture, convert, cultivate, compound). No ask.
- Wk3-4: short case stories (clinic / school / coach).
- Wk5-6: handle the "is this for my size?" objection.
- Wk7-8: introduce the MOND Score (low-entry).
- Wk9-12: fresh-angle re-engagement; invite to retake / book.

Personalize each touch by `vertical`. Keep every email short, plain, one idea, one link.

---

## Published deliverables (the review surface)

The copy below is published as reviewable, versioned deliverables under the MOND
client record, each tagged with its `sequenceKey` so a lead links to its sequence:

| sequenceKey | Deliverable | Portal section |
|---|---|---|
| `gold-warm` | "تسلسل البريد: جولد دافئ (MOND Score)" | `/dashboard/email-sequences` |
| `gold-cold` | "تسلسل البريد: جولد بارد (Apollo)" | `/dashboard/email-sequences` |
| `raw` | "تسلسل البريد: رعاية طويلة (Raw, 60-90 يوم)" | `/dashboard/email-sequences` |
| `diamond-whatsapp` | "تدفّق واتساب: دايموند (فؤاد يدوي)" | `/dashboard/whatsapp-flows` |

Seeded `draft` by `firebase/mond/seed-mond-email-sequences.mjs` +
`firebase/mond/seed-mond-whatsapp-flow.mjs`. Each lead carries `segment` +
`outreachPlan.sequenceKey` (stamped by `firebase/mond/backfill-segments.mjs`),
visible as a badge in the MOND CRM and as an Outreach block in the lead drawer.

## End-to-end launch sequence

1. **Publish** (done): run the two seed scripts. Sequences appear in the portal as `draft`.
2. **Backfill segments** (done): `node firebase/mond/backfill-segments.mjs` so the CRM shows the segment of every lead.
3. **Apollo sequences CREATED (done, 2026-06-10)**: all three exist in Apollo, PAUSED, built from the reviewed copy via `firebase/mond/create-apollo-sequences.mjs`; ids live in `ops/mond-outreach/sequence-ids.json`, sender = `fn@fnasr.com` (Fouad personal, signature auto-appended). Re-run with `--force` after any copy rewrite.
4. **Review + approve**: Fouad reviews the 3 email sequences + the diamond flow in the portal (and/or directly in Apollo). Any rewrite goes back through `arabic-copy-review` / `fouad-voice`, then re-run `create-apollo-sequences.mjs --force`.
5. **Enroll per wave (one command each; enrolling into a PAUSED sequence sends nothing):**
   - `APOLLO_API_KEY=... GOOGLE_APPLICATION_CREDENTIALS=firebase/service-account.json node firebase/mond/enroll-apollo-sequences.mjs --segment=gold-warm --run`
   - `... --segment=gold-cold --run` and `... --segment=raw --run`
   - The staged set equals exactly the leads showing that segment in the CRM (selection reads `mondLeads.segment`). Leads missing an Apollo contact get one created automatically.
   - **Launch = activate the sequence in Apollo** (the explicit human step; nothing auto-sends before it).
   - Diamond: Fouad sends WhatsApp from the lead drawer's WhatsApp tab (templates + one-click send from the Saudi line; auto-logged on the lead + the Inbox).
6. **Weekly**: `firebase/mond/sync-engagement.mjs` to pull Apollo opens/clicks/replies onto each lead's `outreach` block and flag replies (visible in the drawer).
