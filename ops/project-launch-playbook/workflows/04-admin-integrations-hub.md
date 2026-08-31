# Project Launch — Admin Integrations Hub

Every Admireworks admin surface has exactly one page for all external
services: `/admin/integrations`. Behind it is a typed catalog
(`lib/admin/integrations-catalog.ts`), a grid of IntegrationCards, and a
drawer for editing credentials. No per-provider admin page, no bespoke
forms.

**Canonical reference implementations:**
- `Basseqat/apps/web/src/lib/admin/integrations-catalog.ts` — 15 providers,
  Secret Manager backed, test buttons for 17 methods, inbound webhook
  panels, architecture tabs.
- `Mond/apps/web/src/lib/admin/integrations-catalog.ts` — 17 providers
  (adds `payments` and `ai` categories), Firestore-backed (Phase 3 MVP;
  Phase 3b migrates to Secret Manager).

The Basseqat version is the long-term target; the Mond version is the
minimum viable catalog pattern that new projects should start from.

## The Shape

```ts
export type IntegrationCategory =
  | 'messaging' | 'email' | 'payments' | 'analytics'
  | 'ai' | 'monitoring' | 'platform';

export type AppliesAt = 'immediate' | 'next_rollout' | 'functions_cold_start';

export interface IntegrationCredentialField {
  name: string;                 // Secret name — matches env-var / Secret Manager key
  label: string;
  hint?: string;
  type: 'password' | 'text';
  isPublicEnvVar?: boolean;     // true → NEXT_PUBLIC_* baked into client bundle
  appliesAt: AppliesAt;
}

export interface IntegrationDefinition {
  id: string;                   // slug, also drawer key
  nameEn: string;
  nameAr: string;
  category: IntegrationCategory;
  descriptionEn: string;
  descriptionAr: string;
  icon: LucideIcon;
  brandColor: string;           // provider brand hex
  brandBg: string;              // 8%-opacity tint of brandColor
  credentials: IntegrationCredentialField[];
  testMethod: TestMethod;       // enum of provider-specific test functions
  docsUrl?: string;
  hasArchitectureTab?: boolean; // renders the 5th tab explaining multi-client topology
  fromAddressKind?: 'transactional' | 'marketing';
  hasInboundSetupPanel?: boolean;
}
```

Every integration is a single entry in `INTEGRATIONS_CATALOG`. Adding a new
provider = one entry + a test-method enum value. No new files.

## `appliesAt` — When Changes Take Effect

| Value | Takes effect | Typical use |
|---|---|---|
| `immediate` | within seconds of save | `NEXT_PUBLIC_*` tracking IDs mirrored to `appConfig/publicTracking` |
| `next_rollout` | at the next `git push main` (~5 min) | Server-bundled `NEXT_PUBLIC_*` values |
| `functions_cold_start` | within ~1 hour | Secrets consumed by Cloud Functions |

The drawer surfaces this verbatim so the operator knows whether to refresh
or wait. Never lie about timing — operators calibrate expectations on
first use and remember incorrect labels forever.

## Categories

Seven categories in canonical order:

```
messaging → email → payments → analytics → ai → monitoring → platform
```

Projects without a payments surface can omit the `payments` entries, but
keep the type in the enum so the shape stays portable.

## Secret Storage

**Phase 1+ (MVP):** Direct Firestore at `appConfig/integrations`. This is
quick but has two drawbacks:
1. Any user with Firestore read access sees credentials.
2. Credentials end up in Firestore backups.

**Phase 2+ (target):** Cloud Function `updateIntegrationSecret` writes to
Google Secret Manager. The hub reads `getIntegrationSecretsStatus()` which
returns masked metadata (last rotation, configured?) without exposing
plaintext.

New projects should start on Phase 1 (faster to ship) and graduate to
Phase 2 once the integrations list stabilizes.

Firestore rules must restrict writes to the `manage_integrations`
capability regardless of backend:

```
match /appConfig/integrations {
  allow read: if isAdmin();
  allow write: if hasCapability('manage_integrations');
}
```

## Test Methods

Each integration declares one test method — a string enum that maps to a
provider-specific verification call. Examples:

| Method | What it does |
|---|---|
| `whatsapp_phone_info` | GET `/{phoneId}` on Graph API; validates token + phone ID |
| `resend_list_domains` | GET `/domains` on Resend; validates API key |
| `stripe_account_retrieve` | `accounts.retrieve()`; validates secret key |
| `meta_ads_me` | GET `/me` on Meta Marketing API; validates ads_read scope |

Test methods are called from a "Test connection" button in the drawer.
They should:
- Be **idempotent** — no state change.
- Run in **< 3 seconds** — use lightweight endpoints.
- Return **specific failure reasons** — not generic errors.

If a provider has no suitable test endpoint (e.g., Meta Domain
Verification is validated by Meta's crawler, not us), set `testMethod:
null` and skip the button.

## Adding a New Provider: 6-Step Checklist

1. Pick an `id` (slug, lowercase+underscores).
2. Add the entry to `INTEGRATIONS_CATALOG`.
3. Add a new `TestMethod` enum value if the provider needs one.
4. Implement the test method in the Cloud Function (Phase 2+) or skip for
   now (Phase 1).
5. Add the secret names to Firestore rules' `manage_integrations` gate.
6. For `NEXT_PUBLIC_*` credentials: add the variable to `apphosting.yaml`
   with `secret: <name>`.

## Anti-Patterns

- **Do not** create `/admin/integrations/stripe` or other per-provider
  routes. The drawer is the detail view.
- **Do not** hardcode a status dot color — derive from
  `configuredCount / totalCount`.
- **Do not** show plaintext credentials after save — always re-mask.
- **Do not** auto-test on every save — the button is explicit so
  operators know when they're calling the provider's API.
