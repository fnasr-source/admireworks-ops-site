# Post-Deployment Live QA

Use this checklist after every messaging, automation, function, or admin-area deployment.

## Preconditions

- [ ] Correct Firebase or GCP service account is loaded through `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] Target project and environment are confirmed
- [ ] `npm --prefix firebase/functions run build` passes
- [ ] `npm --prefix apps/web run build` passes
- [ ] deployed function list shows the required handlers as active

## Messaging Config Check

- [ ] `appConfig/main.whatsapp.phoneNumberId` is present
- [ ] `appConfig/main.whatsapp.apiKey` or secret-backed token is present
- [ ] `appConfig/main.whatsapp.webhookVerifyToken` is present
- [ ] runtime templates used by the live flow are approved
- [ ] `appConfig/aiReply.enabled` is `true`
- [ ] `socialAutoReplyForMessages` and other channel flags match the launch plan
- [ ] `appConfig/messagingHealth.status` has no critical failures

## Live Flow Test

Send a real inbound message to the designated WhatsApp number and verify the full chain:

- [ ] inbound message appears in the admin inbox
- [ ] `conversationState.lastInboundMessageId` updates for the lead
- [ ] `aiReplyQueue/{leadId}_{messageLogId}` is created when AI should reply
- [ ] the AI or system outbound message is created in `messageLogs`
- [ ] outbound status reaches `sent`, then `delivered`, and ideally `read`
- [ ] the user confirms receipt or delivery telemetry proves the message reached the user

## Admin Area Check

- [ ] admin routes needed for operations return successfully
- [ ] lead status and inbox status update correctly
- [ ] handoff or manual-review states are visible when AI declines or cannot respond
- [ ] reporting or QA screens show the new conversation data

## Debug Path If Admin Receives The Message But The User Gets No Reply

- [ ] confirm `appConfig/aiReply.enabled = true`
- [ ] confirm the inbound message created an `aiReplyQueue` job
- [ ] inspect `processAiReplyQueueOnCreate` and `processAiReplyQueue` logs
- [ ] inspect `conversationState` for human takeover, paused AI, or expired window
- [ ] inspect `messageLogs` for provider errors, re-engagement errors, or missing `providerMessageId`
- [ ] confirm outbound messaging credentials and permissions are valid
- [ ] confirm the system is testing the live environment, not only local emulators

## Debug Path If Messaging Health Blocks Launch

- [ ] inspect pending or overdue handoffs
- [ ] separate stale historical backlog from current runtime failures
- [ ] close or resolve stale staging debt before relying on the health snapshot
- [ ] rerun health calculation and then rerun precampaign QA

## Test Record

| Date | Environment | Lead | Inbound Message | Queue Job | Outbound Log | Delivery Status | Result | Notes |
|---|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | staging or production | Name / Lead ID | | yes or no | log id | sent / delivered / read | pass / fail | |

## Tracking Verification

Verify all 3 tracking channels fire correctly after deployment. Reference: `ops/direct-response-playbook/workflows/tracking-architecture.md`

### Channel 1 — Client-Side Pixel

- [ ] Install Meta Pixel Helper browser extension and visit a public page
- [ ] Confirm `PageView` fires on page load (check helper badge count)
- [ ] Trigger a CTA click and confirm `trackCustom` fires for events in `FORWARD_TO_META` array
- [ ] Open GA4 Realtime report and confirm events arrive (page_view, cta_click)
- [ ] Open Microsoft Clarity dashboard and confirm session recording started
- [ ] Confirm Clarity session is tagged with `lastEvent` custom tag

### Channel 2 — Server-Side CAPI

- [ ] Set `META_TEST_EVENT_CODE` env var to your Events Manager test code
- [ ] Complete a quiz flow with a test email
- [ ] Open Meta Events Manager > Test Events tab
- [ ] Confirm `Lead` event appears with correct `user_data` (hashed email, phone)
- [ ] Confirm `qualifying_completed` event appears for HIGH/MEDIUM tier test leads
- [ ] Confirm `event_id` matches between client-side and server-side events (dedup check)
- [ ] Remove `META_TEST_EVENT_CODE` after verification (or leave empty string)

### Channel 3 — URL-Based Custom Conversions

- [ ] Complete a quiz flow and land on the results page
- [ ] Confirm URL contains `?qualified={tier}` parameter
- [ ] Open Meta Events Manager > Custom Conversions
- [ ] Confirm "Quiz Lead" conversion matches URLs containing `/results`
- [ ] Confirm "Qualified Lead" conversion matches URLs containing `qualified=`
- [ ] If checkout flow exists: confirm checkout and purchase URL-based conversions

### Firestore Event Sink

- [ ] Visit any public page and wait 5 seconds
- [ ] Check Firestore `siteEvents` collection for a new `page_view` document
- [ ] Confirm `anonId`, `sessionId`, `path`, `type`, `createdAt` fields are populated
- [ ] Confirm `attribution` field captures UTM params if present in URL
- [ ] Open an incognito window — confirm a new `anonId` is generated

---

## Quiz & Qualification Verification

Test the full quiz flow through tier routing. Reference: `ops/direct-response-playbook/workflows/quiz-lead-qualification.md`

### Quiz Flow

- [ ] Navigate to the quiz page from a public URL
- [ ] Confirm `quiz_started` event fires (check Firestore `siteEvents`)
- [ ] Answer all 9 questions and confirm `quiz_question_answered` events fire for each
- [ ] On email capture step, enter a test email and submit
- [ ] Confirm `quiz_completed` event fires
- [ ] Confirm results page loads with correct profile name

### Tier Calculation

- [ ] Test with answers that produce HIGH tier (>= 38 points from Q5-Q9): choose all top-scoring answers for Q5-Q9
- [ ] Confirm results page shows WhatsApp CTA and discount timer for HIGH
- [ ] Test with answers that produce MEDIUM tier (28-37 points)
- [ ] Confirm results page shows WhatsApp CTA with softer urgency for MEDIUM
- [ ] Test with answers that produce LOW tier (< 28 points)
- [ ] Confirm results page shows email-only follow-up for LOW, no timer

### Lead Document

- [ ] Check Firestore `leads` collection for the test lead document
- [ ] Confirm `qualifyingTier` field matches expected tier (high/medium/low)
- [ ] Confirm `qualifyingScore` field is a number between 0-50
- [ ] Confirm `qualifyingSource` is `'unified_quiz'`
- [ ] Confirm `quizAnswers` field contains a map of all 9 question answers
- [ ] Confirm `quizProfile` field is set to one of the valid personas
- [ ] Confirm `discountCode` field is populated
- [ ] Confirm `anonId` field links to the browser's anonymous ID cookie

### Admin Visibility

- [ ] Open `/admin/leads` and confirm the test lead appears with qualifying tier badge
- [ ] Open the lead drawer and confirm Q5-Q9 breakdown is displayed
- [ ] Confirm the tier filter dropdown works (filter by high/medium/low)
- [ ] If CRM pipeline exists: confirm lead appears on the correct pipeline column with tier badge

---

## Payment Integration Verification

Test PayMob and Stripe webhook chains. Reference: `ops/direct-response-playbook/reference-systems/the-slim-game.md` section 6.

### PayMob

- [ ] Confirm `PAYMOB_API_KEY` and `PAYMOB_HMAC_SECRET` environment variables are set
- [ ] Initiate a test checkout flow through PayMob
- [ ] Confirm `/api/webhooks/paymob` endpoint receives the POST callback
- [ ] Confirm HMAC signature verification passes (check server logs for errors)
- [ ] On successful payment: confirm lead status updates in Firestore
- [ ] Confirm purchase confirmation email sends via Resend
- [ ] Confirm Meta CAPI `Purchase` event fires (check Events Manager > Test Events)
- [ ] Confirm CRM sequence enrollment triggers for the purchase status change

### Stripe (if configured)

- [ ] Confirm `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment variables are set
- [ ] Use Stripe CLI to forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Trigger a test payment via Stripe checkout
- [ ] Confirm webhook signature verification passes
- [ ] Confirm lead status and payment record update in Firestore
- [ ] Confirm purchase confirmation email sends

### General Payment Checks

- [ ] Confirm idempotency: re-sending the same webhook does not create duplicate records
- [ ] Confirm failed/declined payments do not update lead status to purchased
- [ ] Confirm the payment amount matches the expected product price

---

## Email Delivery Verification

Test Resend transactional and sequence delivery. Reference: `ops/direct-response-playbook/reference-systems/the-slim-game.md` section 5.

### Transactional Emails

- [ ] Confirm `RESEND_API_KEY` environment variable is set
- [ ] Complete a quiz flow with a real email address you can check
- [ ] Confirm quiz results email arrives within 60 seconds
- [ ] Confirm email subject contains the quiz profile name
- [ ] Confirm email body contains the discount code
- [ ] Check the email in Resend dashboard: confirm `category:quiz_result` tag is present

### Webhook Processing

- [ ] Confirm `/api/webhooks/resend` endpoint is configured in Resend dashboard
- [ ] Open the received email (trigger an `open` event)
- [ ] Click a link in the email (trigger a `click` event)
- [ ] Check Firestore: confirm lead's `emailOpenCount` and `emailClickCount` fields update
- [ ] Confirm these counters feed into lead scoring (dim 9: email engagement)

### Sequence Emails

- [ ] If email sequences are configured: confirm the first sequence email delivers
- [ ] Confirm correct template is selected based on lead tier/profile
- [ ] Confirm unsubscribe link works and updates lead status

---

## CRM Pipeline Verification

Verify lead scoring, hot lead alerts, and sequence enrollment. Reference: `ops/direct-response-playbook/workflows/crm-lead-scoring.md`

### Lead Scoring

- [ ] Open `/admin/crm/scoring` and confirm scores are computing for existing leads
- [ ] Confirm score breakdown shows contributions from all relevant dimensions
- [ ] Confirm tier badges (Hot/Warm/Cold/Dead) display correctly
- [ ] Manually change a lead status and confirm the score recalculates
- [ ] Confirm `topSignal` field displays the highest-contributing reason

### Hot Lead Alerts

- [ ] Create or identify a lead with score >= 60 (hot threshold)
- [ ] Confirm hot lead appears in `/admin/hot-leads` queue
- [ ] If Telegram integration is configured: confirm alert arrives in sales team chat
- [ ] Confirm the Telegram alert contains: lead name, score, tier, admin link
- [ ] Confirm an `urgent` priority task is created in `salesTasks`

### Sequence Enrollment

- [ ] Trigger a quiz completion for a new test lead
- [ ] Check `sequenceEnrollments` collection: confirm enrollment record exists
- [ ] Confirm `status: 'active'` and `currentStep: 0`
- [ ] Check `salesTasks` collection: confirm first task was created
- [ ] Complete the first task and confirm enrollment advances to step 1
- [ ] Confirm next task is created with correct `dueDate` based on step offset

### Scoring Config

- [ ] Open `/admin/crm/scoring/settings` (if built)
- [ ] Confirm scoring config loads from `appConfig/leadScoring`
- [ ] Make a small adjustment (e.g., change hotThreshold to 61)
- [ ] Save and confirm scores recalculate with new threshold
- [ ] Revert the change

---

## Insights Dashboard Verification

Verify all data sources connect to the insights dashboard.

### Data Sources

- [ ] Open `/admin/insights` and confirm the page loads without errors
- [ ] Confirm date range selector works (switch between 7d, 30d, custom)
- [ ] Confirm executive summary tab shows aggregated metrics

### API Endpoints

Test each insights endpoint returns data (not errors):

- [ ] `GET /api/insights/executive` — returns summary metrics
- [ ] `GET /api/insights/quiz-intelligence` — returns quiz completion data
- [ ] `GET /api/insights/creative-correlation` — returns UTM/creative data
- [ ] `GET /api/insights/whatsapp-quality` — returns messaging metrics
- [ ] `GET /api/insights/lead-timeline?leadId={id}` — returns timeline for a specific lead
- [ ] `GET /api/insights/anomalies` — returns anomaly detection results
- [ ] `GET /api/insights/recommended-actions` — returns action recommendations
- [ ] `GET /api/insights/channel-transitions` — returns channel transition data
- [ ] `GET /api/insights/cohort-analysis` — returns cohort data
- [ ] `GET /api/insights/revenue-forecast` — returns revenue projections
- [ ] `GET /api/insights/unit-economics` — returns unit economics data

### Cross-System Data Integrity

- [ ] Confirm funnel chart shows leads progressing through expected stages
- [ ] Confirm revenue metrics match payment records in Firestore
- [ ] Confirm engagement metrics reflect recent `siteEvents` data
- [ ] Confirm quiz intelligence shows the correct profile distribution

---

## Specific Lesson Added On 2026-03-19

- inbound WhatsApp messages were visible in admin
- AI reply was not reaching the user
- root cause: `appConfig/aiReply.enabled` was disabled
- fix: re-enable AI replies, requeue a recent inbound message, verify outbound delivery, refresh messaging health, rerun precampaign QA

