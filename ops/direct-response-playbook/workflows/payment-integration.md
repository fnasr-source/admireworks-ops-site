# Payment Integration

Use this workflow when setting up payment processing for a direct-response client. Covers the dual-provider pattern (PayMob for Egypt, Stripe for international) and the shared checkout architecture.

---

## Provider Decision Tree

### When to use PayMob (Egypt primary)

Use PayMob when the client sells to Egyptian customers paying in EGP. PayMob supports cards, mobile wallets, kiosk/cash, and installments.

There are two PayMob integration paths:

#### Path A: Unified Checkout / Create Intention API

Use this only when all of the following are confirmed:

- Paymob support or the dashboard confirms the account has **live online-payment integrations** for the current API flow
- Live `Secret Key` and live `Public Key` are available
- Live `Integration ID(s)` are confirmed for the required payment methods
- Test flow passed first in Test mode

Required credentials:
- `PAYMOB_SECRET_KEY` (live)
- `PAYMOB_PUBLIC_KEY` (live)
- `PAYMOB_HMAC_SECRET` (live)
- Integration ID(s) for each payment method

#### Path B: Hosted Product Links

Use this when:

- The client already has working hosted payment links or standalone checkout pages
- `Create Intention` returns errors like `Invalid Payment method integration` or `Integration ID/Name does not exist in our system`
- The merchant account supports payment links but not live online payments for the newer API flow

This is the faster go-live path. Create one hosted link per offer/payment plan and store them as runtime env vars:

```
NEXT_PUBLIC_PAYMOB_<PRODUCT>_URL=https://accept.paymob.com/...
```

One env var per offer variant. Example from reference implementation:

- `NEXT_PUBLIC_PAYMOB_DRESS_CHALLENGE_URL`
- `NEXT_PUBLIC_PAYMOB_ENTRY_OFFER_URL`
- `NEXT_PUBLIC_PAYMOB_MENTAL_BARIATRIC_FULL_URL`
- `NEXT_PUBLIC_PAYMOB_MENTAL_BARIATRIC_SPLIT_URL`

### When to use Stripe (international)

Use Stripe when the client sells internationally or needs multi-currency support. Stripe handles cards, Apple Pay, Google Pay, and bank transfers.

Required credentials:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### When to use both (dual-provider pattern)

Use both when the client sells to both Egyptian and international customers. PayMob is primary for EGP transactions; Stripe is fallback for international.

The checkout page detects the user's context (country, currency selection, or explicit toggle) and routes to the correct provider.

---

## Shared Checkout Architecture

Keep all payment processing behind a single shared checkout flow:

```
Checkout page
  ├── Detect provider (PayMob or Stripe)
  ├── Create session/intention via API route
  ├── Redirect user to provider or render inline form
  └── Handle return + webhook
```

### Key API routes

| Route | Purpose |
|---|---|
| `/api/create-paymob-session` | Creates PayMob session or returns hosted link URL |
| `/api/create-payment-intent` | Creates Stripe PaymentIntent |
| `/api/paymob/return` | Handles browser redirect back from PayMob |
| `/api/webhooks/paymob` | Receives PayMob transaction callbacks |
| `/api/webhooks/stripe` | Receives Stripe webhook events |

### Stripe PaymentElement setup

For inline payment forms, use `@stripe/react-stripe-js` with the `PaymentElement` component:

1. Create a PaymentIntent on the server with metadata (product, customer email, names, UTMs, cohortId)
2. Return the `clientSecret` to the frontend
3. Render `<PaymentElement>` inside `<Elements>` with the client secret
4. On success, the webhook handles the rest

### PayMob session creation

For Unified Checkout:

1. Call `POST https://accept.paymob.com/v1/intention/` with `amount`, `currency`, `payment_methods`, `billing_data`, and `extras`
2. Receive a `client_secret` and redirect URL
3. Redirect the user to the Paymob checkout page

For hosted product links:

1. Look up the env var for the product/plan combination
2. Redirect the user to the hosted link URL directly

---

## Webhook Handling

### PayMob webhook (`/api/webhooks/paymob`)

Receives a POST from PayMob on transaction completion.

1. **Verify HMAC**: Check the `?hmac=` query parameter against `PAYMOB_HMAC_SECRET`
2. **Extract transaction data**: `body.obj.success`, `body.obj.amount_cents`, `body.obj.order`, `body.obj.id`
3. **Resolve lead**: Match by `paymobOrderId`, `paymobGatewayOrderId`, or email fallback
4. **Create payment record**: Write to `payments` collection with status `confirmed` or `failed`
5. **Update lead status**: Set to `purchased_entry_offer` or `customer` depending on product
6. **Build lead tags**: Call `buildLeadTagsFromLead()` with the new status
7. **Trigger sequence enrollment**: Auto-enroll in the appropriate sales sequence
8. **Handle entry offer enrollment**: If product is entry offer, create enrollment record with access token
9. **Server-side tracking**: Fire GA4 `Purchase` event and Meta CAPI `Purchase` event
10. **Send confirmation email**: Via Resend with product-specific template
11. **Push to external CRM**: Tag in Systeme.io or equivalent

### Stripe webhook (`/api/webhooks/stripe`)

Receives Stripe webhook events (signature-verified).

Handles two event types:

**`payment_intent.succeeded`:**

1. **Verify signature**: Using `constructWebhookEvent(body, signature)` with `STRIPE_WEBHOOK_SECRET`
2. **Resolve product**: From metadata, then session metadata, then line item name, then amount-based inference, then fallback to `external_payment`
3. **Resolve customer**: From metadata, then checkout session `customer_details`, then charge `billing_details`
4. **Find or create lead**: Search by email in `leads` collection
5. **Create payment record**: Write to `payments` collection
6. **Update lead status**: Same as PayMob flow
7. **Trigger sequence enrollment**: Auto-enroll in sales sequence
8. **Handle entry offer enrollment**: Create enrollment if applicable
9. **Decrement cohort spots**: If product is cohort-based (e.g., Dress Challenge)
10. **Server-side tracking**: GA4 + Meta CAPI Purchase events
11. **Send confirmation email**: Via Resend
12. **Send Telegram notification**: Alert team in the sales channel
13. **Notify admin users**: Email all users in `adminUsers` collection
14. **Push to external CRM**: Systeme.io tag

**`payment_intent.payment_failed`:**

1. Write failed payment record to Firestore
2. Send Telegram notification with failure details

---

## Revenue Analytics

### Cohort-based tracking

Every payment record stores:

- `product`: The product type (e.g., `entry_offer`, `dress_challenge`, `mental_bariatric`)
- `paymentSource`: How the payment was initiated (`platform`, `payment_link`, `direct`)
- `cohortId`: For cohort-based products, links the payment to a specific cohort
- `mentalBariatricPlan`: For split-payment products, tracks `full` vs `split`

### Source-attributed revenue

Revenue is attributed to the lead's acquisition source through:

- `lead.source`: Original acquisition channel (e.g., `quiz`, `checkout`, `stripe_checkout`)
- `lead.attribution`: Full UTM data (source, medium, campaign, content, term)
- `lead.tracking`: Meta pixel data (fbp, fbc, clientIpAddress, clientUserAgent)

The insights dashboard Acquisition and Revenue tabs cross-reference payment data with lead attribution to show revenue by source.

### Entry offer tracking (21-day program pattern)

The entry offer is a low-price introductory product (e.g., 21-day program at ~99 AED) used as a tripwire to:

1. Convert quiz leads into paying customers at low risk
2. Provide immediate value and build trust
3. Upsell to the full program during or after the entry period

Implementation:

- On purchase, `createEntryOfferEnrollment()` creates an enrollment doc with a unique `accessToken`
- The customer accesses their dashboard at `/entry-offer/dashboard?token=...`
- The enrollment tracks: `track` (A/B), `variant` (quiz_first/direct_entry), `startDate`, `completedDays`
- Lead status changes from `checkout_started` to `purchased_entry_offer`
- An upsell sequence is automatically triggered via sequence enrollment

---

## Credential Management

Store all payment credentials in environment variables, never in code:

| Variable | Where stored | Notes |
|---|---|---|
| `PAYMOB_SECRET_KEY` | Doppler / App Hosting env | Live mode only |
| `PAYMOB_PUBLIC_KEY` | Doppler / App Hosting env | Live mode only |
| `PAYMOB_HMAC_SECRET` | Doppler / App Hosting env | For webhook verification |
| `STRIPE_SECRET_KEY` | Doppler / App Hosting env | Live mode only |
| `STRIPE_PUBLISHABLE_KEY` | Doppler / App Hosting env | Can be `NEXT_PUBLIC_` |
| `STRIPE_WEBHOOK_SECRET` | Doppler / App Hosting env | Endpoint-specific |
| `NEXT_PUBLIC_PAYMOB_*_URL` | Doppler / App Hosting env | One per hosted product link |

---

## PayMob Dashboard Checklist

Before going live, inspect the PayMob account in both Test and Live mode:

### Settings

- [ ] `Secret Key` available and returns a value (not `null` or `403`)
- [ ] `Public Key` available
- [ ] `HMAC` secret available
- [ ] Current mode is correct (Test or Live)
- [ ] Logged-in account is the merchant owner (not a staff user with limited permissions)

### Payment Integrations

For each visible integration:

- [ ] Integration ID captured
- [ ] Payment method label noted (cards, wallets, kiosk, installments)
- [ ] Mode confirmed (Live or Test)
- [ ] Callback URLs configured

### Common failure modes

- A visible live card integration can exist and still fail for `Create Intention`
- Dashboard showing `Can not view API keys` or `Can not renew API keys` means the account is not ready
- `Create Intention` returning `Invalid Payment method integration` for visible live IDs means the key and integration are not valid together
- Always start in Test mode and verify before moving to Live

---

## Go-Live Checklist

- [ ] Test mode succeeded for both providers (if using both)
- [ ] Live credentials stored in Doppler / App Hosting env vars (not in git)
- [ ] Webhook URLs configured in both PayMob and Stripe dashboards
- [ ] Browser return URL configured in PayMob dashboard
- [ ] Each product/plan returns the correct payment URL or intention
- [ ] Webhook writes payment results correctly to Firestore
- [ ] Thank-you flow redirects correctly after payment
- [ ] Admin can see payment status in the admin panel
- [ ] Telegram notifications firing for successful and failed payments
- [ ] Confirmation emails sending correctly for each product type
- [ ] Server-side GA4 and Meta CAPI events firing
- [ ] One real payment completed per provider after launch prep

---

## Support Escalation (PayMob)

If `Create Intention` fails with `Invalid Payment method integration`, send Paymob support:

> We are integrating Paymob for a custom website using the current Unified Checkout / Create Intention flow. We tested with the provided credentials, but live Create Intention returns "Invalid Payment method integration". Please confirm the exact live Integration ID(s) valid for online payments for this merchant account, and confirm whether the account is currently configured only for payment links or also for live online API payments.

Include: MID, merchant profile identifier, test or live mode, exact integration IDs tested, exact error text, and whether the dashboard has usable test/live public and secret keys.
