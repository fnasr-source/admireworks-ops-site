# Email System Setup

Use this workflow when setting up transactional and marketing email for a direct-response client. Covers Resend integration, dual-stream architecture, template patterns, and compliance.

---

## Resend Integration

### Initial setup

1. Create a Resend account at `https://resend.com`
2. Generate an API key with sending permissions
3. Store the key as `RESEND_API_KEY` in Doppler / App Hosting env vars
4. Install the SDK: `npm install resend`

### Domain verification

For each sending domain, add DNS records in the client's domain registrar:

1. **SPF record**: TXT record allowing Resend's servers to send on behalf of the domain
2. **DKIM record**: CNAME records for cryptographic email signing (Resend provides these)
3. **DMARC record**: TXT record defining the domain's email authentication policy

Resend provides all required DNS records in their dashboard after adding a domain.

### Email client initialization

Create a shared email client module:

```typescript
import { Resend } from 'resend';

let _resend: Resend | undefined;

function getResend(): Resend {
    if (!_resend) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
        _resend = new Resend(apiKey);
    }
    return _resend;
}
```

This uses lazy initialization so the Resend client is only created when first needed.

---

## Dual-Stream Architecture

Set up two sending subdomains per client to separate transactional and marketing email:

| Stream | Subdomain pattern | Purpose | Reputation |
|---|---|---|---|
| Transactional | `notify.clientdomain.com` | System-generated emails (confirmations, alerts) | Must stay high; never send marketing from this |
| Marketing | `mail.clientdomain.com` | Sequences, nurture, promotional | Separate reputation from transactional |

### Why two streams

- Transactional emails (purchase confirmations, password resets) must always reach the inbox
- Marketing emails have higher unsubscribe and spam complaint rates
- If marketing damages the domain reputation, transactional email remains unaffected
- Each subdomain gets its own SPF/DKIM/DMARC records

### From address pattern

Use a branded from address that includes the expert/brand name:

```
Dr. Kareem Gamal | The Slim Game <DrkareemGamal@theslimgame.com>
```

Set a `replyTo` address so replies go to the right inbox.

---

## Transactional Email Patterns

### Quiz results email

Sent immediately after quiz completion. Contains:

- Personalized results based on quiz profile (e.g., persona identification)
- Qualifying tier explanation
- Next step CTA (WhatsApp for HIGH/MEDIUM, program link for LOW)
- Resend tags: `{ name: 'category', value: 'quiz_results' }`

### Quiz result reminder

Sent 24-48 hours after quiz completion if no action taken. Re-presents the results with urgency framing.

### Payment confirmation email

Sent on successful payment (triggered by both Stripe and PayMob webhooks). Contains:

- Customer name and greeting
- Product name and amount paid
- Payment method indicator (Stripe or PayMob)
- Product-specific content:
  - Entry offer: Dashboard access link with token
  - Full program: Next steps and welcome message
  - Cohort program: Cohort details and start date
- Resend tags: `{ name: 'category', value: 'purchase_confirmation' }, { name: 'product', value: productType }`

### Admin purchase notification

Sent to all users in the `adminUsers` collection when a purchase occurs. Contains purchase details and a link to the admin leads page.

### System alerts

Revision notifications, delivery status updates, and operational alerts sent to internal team members.

---

## Sequence Patterns

Sequences are automated multi-step email/WhatsApp flows triggered by lead status changes, tag additions, or score thresholds.

### Nurture sequence

**Trigger**: `qualifying_completed` with tier `low`
**Purpose**: Educate and build trust with leads not yet ready to buy
**Steps**: 5-7 emails over 14-21 days

Typical structure:
1. Day 0: Welcome + value proposition reinforcement
2. Day 2: Educational content (pain point #1)
3. Day 5: Social proof / testimonial
4. Day 8: Educational content (pain point #2)
5. Day 12: Case study / transformation story
6. Day 16: Soft offer with scarcity
7. Day 21: Final call or re-segment

### Upsell sequence

**Trigger**: `status_change` to `purchased_entry_offer`
**Purpose**: Convert entry offer buyers to full program
**Steps**: 4-6 messages over the entry offer duration (e.g., 21 days)

Typical structure:
1. Day 3: Check-in + early results teaser
2. Day 7: Progress celebration + "what comes next"
3. Day 14: Full program preview + limited offer
4. Day 18: Urgency + expiring bonus
5. Day 21: Final upgrade opportunity

### Abandoner recovery sequence

**Trigger**: `status_change` to `checkout_started` (then no purchase within 1 hour)
**Purpose**: Recover leads who started checkout but did not complete
**Steps**: 3 messages over 48 hours

### Re-engagement sequence

**Trigger**: `score_threshold` with tier `cold` or `dead`
**Purpose**: Reactivate inactive leads
**Steps**: 3-4 messages over 7-14 days

---

## Dynamic Template Selection

Email templates are selected based on the lead's qualifying tier and the triggering event:

| Event | HIGH tier | MEDIUM tier | LOW tier |
|---|---|---|---|
| Quiz completed | Results + WhatsApp CTA | Results + WhatsApp CTA | Results + program CTA |
| Qualifying completed | WhatsApp consultation invite | WhatsApp consultation invite | Nurture sequence starts |
| Payment confirmation | Purchase receipt + dashboard link | Purchase receipt + dashboard link | Purchase receipt + dashboard link |
| Entry offer progress | Check-in + upsell hint | Check-in + upsell hint | Check-in + educational |

### Template structure

Each email template is a function that returns an HTML string:

```typescript
export function purchaseConfirmationEmailHtml(
    customerName: string,
    paymentMethod: 'stripe' | 'paymob',
    amount: number,
    currency: string,
    options: {
        productType: 'dress_challenge' | 'entry_offer' | 'mental_bariatric';
        mentalBariatricPlan?: string;
        dashboardUrl?: string;
    }
): string { ... }
```

Templates use inline CSS for email client compatibility. RTL layout with `dir="rtl"` for Arabic content.

---

## Webhook Delivery Tracking

### Resend webhook (`/api/webhooks/resend`)

Configure a Resend webhook to receive delivery events:

- `email.sent`: Email accepted by Resend
- `email.delivered`: Email delivered to recipient's mail server
- `email.opened`: Recipient opened the email (pixel tracking)
- `email.clicked`: Recipient clicked a link
- `email.bounced`: Email bounced (hard or soft)
- `email.complained`: Recipient marked as spam

Store these events in a `emailEvents` Firestore collection for analytics.

### Delivery monitoring

Track these metrics in the insights dashboard Email tab:

- **Delivery rate**: `delivered / sent` (target: >97%)
- **Open rate**: `opened / delivered` (benchmark varies by industry)
- **Click rate**: `clicked / delivered`
- **Bounce rate**: `bounced / sent` (alert if >2%)
- **Complaint rate**: `complained / delivered` (alert if >0.1%)

---

## Sequence Email Sending

Sequence emails are sent via a dedicated API route:

```
POST /api/sequence-email/send
```

This route:
1. Looks up the enrollment and sequence step
2. Resolves the template for the step
3. Sends via Resend with appropriate tags
4. Updates the enrollment record with send timestamp
5. Schedules the next step if applicable

---

## Multi-Language Support

For clients with multi-language audiences:

1. Store email templates with language-keyed variants
2. Detect the lead's language from quiz answers, browser locale, or explicit preference
3. Select the appropriate template variant at send time
4. Use RTL layout for Arabic, LTR for English

Default language is Arabic (Egyptian dialect) for MENA-focused clients.

---

## Compliance

### CAN-SPAM (US)

- Include physical mailing address in marketing emails
- Provide clear unsubscribe mechanism
- Honor unsubscribe requests within 10 business days
- Do not use deceptive subject lines

### GDPR (EU)

- Obtain explicit consent before sending marketing emails
- Provide easy unsubscribe in every email
- Honor data deletion requests
- Document consent timestamps

### Saudi Anti-Spam Regulations

- Obtain prior consent for commercial communications
- Include sender identification in every message
- Provide opt-out mechanism
- Comply with CITC guidelines on electronic marketing

### Implementation

- Store `emailConsent: true` and `emailConsentAt: timestamp` on the lead document
- Track unsubscribes: set `status: 'unsubscribed'` on the lead
- Never send marketing email to leads with `status: 'unsubscribed'`
- Sequence enrollment checks consent before sending
- Include unsubscribe link in every marketing email footer

---

## Setup Checklist

- [ ] Resend account created and API key generated
- [ ] `RESEND_API_KEY` stored in Doppler / App Hosting env
- [ ] Transactional subdomain (`notify.clientdomain.com`) DNS records added and verified
- [ ] Marketing subdomain (`mail.clientdomain.com`) DNS records added and verified
- [ ] SPF, DKIM, and DMARC records verified for both subdomains
- [ ] From address configured with brand name
- [ ] Reply-to address set to monitored inbox
- [ ] Purchase confirmation template created (one per product type)
- [ ] Quiz results template created
- [ ] Nurture sequence template set created
- [ ] Upsell sequence template set created
- [ ] Resend webhook configured at `/api/webhooks/resend`
- [ ] Email delivery metrics visible in insights dashboard
- [ ] Unsubscribe mechanism tested
- [ ] Compliance footer included in all marketing templates
