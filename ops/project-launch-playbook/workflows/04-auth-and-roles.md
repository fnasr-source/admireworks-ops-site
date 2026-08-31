# Project Launch — Auth & Roles

Every admin page in every project is gated by Firebase Auth + a Firestore role document. The same four roles (owner, admin, team, client) + break-glass email list apply everywhere. By the end of this workflow the new project has a working sign-in, role lookup, and admin gate.

## Roles

### The four-role model

| Role | Can see | Typical user |
|---|---|---|
| **owner** | Everything, incl. billing | Fouad |
| **admin** | Everything except billing | Team leads |
| **team** | Assigned clients only | Ops team, campaign managers |
| **client** | Own data only (reports, invoices) | The client's users |

### Break-glass emails

Hard-coded list of emails that always resolve to `admin` regardless of Firestore. Used for recovery when Firestore role docs get wiped. Keep it short — typically 2-3 emails.

Store in `src/lib/break-glass.ts`:

```ts
export const BREAK_GLASS_EMAILS = [
  'fnasr@admireworks.com',
  // add very sparingly
];
```

## Firebase Auth Setup

### Enable providers

Firebase Console → Authentication → Sign-in method:

- **Google** — always enable. Use Firebase-managed OAuth client; no custom config needed.
- **Email/Password** — enable for clients who won't use Google.

Skip phone, anonymous, and federated providers unless the project has a specific need.

### Add the admin email allowlist

If the admin panel is internal-only (most projects), add an email allowlist check at sign-in. Reject sign-in from non-allowlisted emails so random Google users can't even create an account.

Reference: `Admireworks Internal OS/apps/client-portal/src/contexts/AuthContext.tsx` — the `isInternal` computation.

## Firestore Role Documents

### Collection: `userProfiles`

Doc ID = Firebase Auth UID. Shape:

```ts
{
  uid: string;
  email: string;
  role: 'owner' | 'admin' | 'team' | 'client';
  clientIds?: string[];   // for team role: assigned clients
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Create on first sign-in

Server-side API route `POST /api/auth/provision-user`:

1. Verify the Firebase ID token
2. Check if `userProfiles/{uid}` exists
3. If not, check break-glass list → assign `admin`
4. If not break-glass, assign `client` (most restrictive)
5. Create the doc

Reference: `Admireworks Internal OS/apps/client-portal/src/app/api/admin/create-client-user/route.ts`.

## AuthContext

### Create `src/contexts/AuthContext.tsx`

Reads Firebase Auth state, fetches `userProfiles/{uid}` on sign-in, exposes:

- `user` — Firebase User object or null
- `profile` — Firestore profile doc
- `loading` — boolean
- `isOwner`, `isAdmin`, `isTeam`, `isClient`, `isInternal` — computed booleans
- `signIn()`, `signOut()` — action functions

Copy verbatim from `Admireworks Internal OS/apps/client-portal/src/contexts/AuthContext.tsx` and delete the `clientAccessService` + `membershipClientIds` bits if the app doesn't need client-assignment logic.

### Wrap the app

In `src/app/layout.tsx`:

```tsx
<AuthProvider>{children}</AuthProvider>
```

## Server-Side Auth

### Create `src/lib/api-auth.ts`

Helpers for API routes:

- `getAuthenticatedUser(request)` — extracts + verifies Bearer token, returns `{ uid, email, role }`
- `requireAdmin(user)` — boolean gate
- `requireRole(user, role)` — generic gate

Reference: `Admireworks Internal OS/apps/client-portal/src/lib/api-auth.ts`.

### Gate every API route

```ts
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  // ...
}
```

No exceptions. Even "internal tools" get this — shipping without it and backfilling is how you leak data.

## Firestore Rules

### Admin-only collections

```
match /databases/{database}/documents {
  function isAuth() { return request.auth != null; }
  function isAdmin() {
    return isAuth() &&
      get(/databases/$(database)/documents/userProfiles/$(request.auth.uid)).data.role in ['owner', 'admin'];
  }
  function isBreakGlass() {
    return isAuth() && request.auth.token.email in ['fnasr@admireworks.com'];
  }
  function canAdmin() { return isAdmin() || isBreakGlass(); }

  match /userProfiles/{uid} {
    allow read: if isAuth() && (request.auth.uid == uid || canAdmin());
    allow write: if canAdmin();
  }

  match /leads/{id}  { allow read, write: if canAdmin(); }
  match /clients/{id} { allow read, write: if canAdmin(); }
  // ... one block per collection
}
```

Every collection is explicit. No wildcard `match /{document=**}` writes in production.

## Sign-In Page

### Create `/login`

Copy `Admireworks Internal OS/apps/client-portal/src/app/login/` → `src/app/login/`. Themes to the new brand via the CSS vars from workflow 02.

### Redirect unauthenticated users

Middleware (or a per-page gate) redirects to `/login` with a `?returnTo=` param. After sign-in, redirect back.

## Source of truth

- AuthContext: `Admireworks Internal OS/apps/client-portal/src/contexts/AuthContext.tsx`
- API auth helpers: `Admireworks Internal OS/apps/client-portal/src/lib/api-auth.ts`
- Break-glass pattern: `Admireworks Internal OS/apps/playbooks/src/lib/break-glass.ts`
- Firestore rules example: `Admireworks Internal OS/firestore.rules`, `Basseqat/firestore.rules`
- Role-based access table: `Admireworks Internal OS/CLAUDE.md` → "Role-Based Access" section
