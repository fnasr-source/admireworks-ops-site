# Project Launch — Admin Access Policy

Every Admireworks admin enforces access through a single policy file:
`lib/admin/access-policy.ts`. Roles map to capabilities; capabilities gate
nav visibility, API routes, and UI controls. No per-page permission
checks scattered across the codebase.

**Canonical reference implementations:**
- `Basseqat/apps/web/src/lib/admin/access-policy.ts` — 5 roles
  (superadmin, admin, sales_manager, sales_agent, viewer), 13 capabilities,
  `INTERNAL_ONLY_CAPABILITIES` actively filtered for client users.
- `Mond/apps/web/src/lib/admin/access-policy.ts` — 3 roles (superadmin,
  admin, viewer), 18 capabilities, empty `INTERNAL_ONLY_CAPABILITIES`
  (no client tenants yet; filter preserved for future convergence).

## Role Count Guidance

| Role count | When to use |
|---|---|
| 3 (superadmin / admin / viewer) | Internal-only tools (MOND admin, AW Internal OS) |
| 5 (+ sales_manager, sales_agent) | Client-facing CRMs with operator sub-specialization (Basseqat, Slim Game) |

Start with 3. Graduate to 5 when sales ops actually demand the split.
Don't pre-build roles nobody uses — dead capabilities rot.

## Capability Naming

Format: `verb_domain`.

| Verb | Meaning |
|---|---|
| `view_*` | Read-only access to a section |
| `manage_*` | Full CRUD on a domain |
| `edit_*` | Write to a specific sub-domain (templates, sequences) |
| `reply_*` | Outbound write on messaging |
| `delete_*` | Destructive — split out when deletion is rare vs. common |

Capabilities map 1:1 to a noun in the domain. If you can't name the
capability, the domain boundary is wrong.

## `INTERNAL_ONLY_CAPABILITIES`

Capabilities that must never be held by a `client` userType, even if they
have a role that would otherwise grant them. Typical entries:

- `view_system`
- `manage_members`
- `manage_integrations`
- `manage_scoring`

Filtered out by `getAllowedCapabilities(role, userType)` when
`userType === 'client'`.

For internal-only projects (Mond admin), the set is empty — the filter
becomes an identity pass-through. Keep the filter function present
regardless so the code shape matches across projects and future
convergence is trivial.

## 3-Tier Auth Resolver

Every admin must implement resolution in this order in
`components/admin/AdminAuthProvider.tsx`:

### Tier 1: Firebase Custom Claims

Claims are set via a Cloud Function (`setUserRole`). Fastest path — no
Firestore read per request. Use for established members.

### Tier 2: Firestore Allowlist

Live-subscribed to `appConfig/adminAccessControl`:

```
{
  members: {
    [memberId: string]: {
      email: string,
      role: AdminRole,
      userType: AdminUserType,
      accessState: 'active' | 'pending' | 'disabled',
      displayName?: string,
      disabledAt?: Timestamp,
    }
  }
}
```

Editable via `/admin/team` (when shipped) or the Firebase Console. Used
for members who haven't had custom claims propagated yet, or for projects
without the claims flow wired.

### Tier 3: Break-Glass Constants

Hardcoded in `lib/admin/auth-constants.ts`:

```ts
export const BREAK_GLASS_SUPERADMIN_EMAILS: readonly string[] = [
  'fnasr@admireworks.com',
];
```

Always grants superadmin when the email matches, regardless of Firestore
or claims state. The only path that works when Firestore is unreachable.

**Rules for break-glass:**
- Never more than 2–3 emails.
- Only for agency leads — not for client operators.
- Log break-glass activations in `/admin/logs` so an audit trail exists.

## Why No Password Break-Glass

Past projects included a hardcoded password (`ADMIN_PASSWORD`) as a
fallback. We removed it across all new admins because:

1. Hardcoded passwords leak into the client bundle.
2. Rotation requires a code change.
3. `BREAK_GLASS_SUPERADMIN_EMAILS` already solves "Firestore is down" for
   the agency leads who need emergency access.

If a non-lead operator needs access while Firestore is down, the correct
path is to add their email to the constants file temporarily, redeploy,
and remove it after. This is a deliberate friction — password fallbacks
have caused more incidents than they've prevented.

## Firestore Rules — The Gate

Roles and capabilities must be enforced server-side, not just in the UI.
The canonical rule template:

```
function memberRecord() {
  return get(/databases/$(database)/documents/appConfig/adminAccessControl)
    .data.members[request.auth.token.email.lower()];
}

function isAdmin() {
  return request.auth != null &&
    memberRecord() != null &&
    memberRecord().accessState == 'active';
}

function hasRole(role) {
  return isAdmin() && memberRecord().role == role;
}

function hasCapability(cap) {
  return isAdmin() && (
    hasRole('superadmin') ||
    (hasRole('admin') && cap in ['view_dashboard', 'view_sales', /* ... */])
  );
}
```

The capability mapping in rules must match `ROLE_RULES` in
access-policy.ts. When you change one, change the other. Consider a
codegen script if the project has >20 capabilities.

## Seeding the Allowlist

Every project must ship with a seed script that populates the initial
allowlist idempotently:

```
firebase/scripts/seed-admin-allowlist.mjs
```

Run it with the project's service account credentials after first deploy.
See `Mond/firebase/scripts/seed-admin-allowlist.mjs` for the canonical
implementation (merge-safe, preserves manual edits, minimal deps).

## Anti-Patterns

- **Do not** check roles in page components. Check capabilities via the
  `useAdminAuth().can(capability)` helper.
- **Do not** hardcode a list of emails in a page file. That list goes in
  `auth-constants.ts` or the Firestore allowlist.
- **Do not** grant superadmin to every AW employee by default. Most need
  `admin` or `viewer`. Overbroad permissions compound incidents.
- **Do not** enforce capabilities only in the UI. Mirror every gate in
  Firestore rules.
