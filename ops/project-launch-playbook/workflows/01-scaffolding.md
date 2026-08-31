# Project Launch — Scaffolding

The skeleton: a Next.js app, Firebase wiring, App Hosting config, working `npm run dev`. By the end of this workflow the repo builds locally and deploys successfully to a staging App Hosting backend.

## App Structure

### Decide standalone vs monorepo

- **Standalone** (most clients): single Next.js app at repo root. This is how Basseqat, Slim Game, Edrak Space, Mond are built.
- **Monorepo** (only for `Admireworks Internal OS`): `apps/<app-name>/` with its own `package.json` per app. Don't start new clients as monorepos — the overhead isn't worth it.

### Create the Next.js app

```bash
npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir --import-alias "@/*"
```

Confirm Next.js 16.x, React 19.x, TypeScript 5.9.x — match the versions used in existing projects. The admin UI components (workflow 02) depend on these.

### Baseline files

Copy from any of the three reference projects and adjust:
- `next.config.ts` — image domains, experimental flags
- `tsconfig.json` — strict mode, `@/*` → `./src/*`
- `eslint.config.mjs` — flat config
- `postcss.config.mjs`, `tailwind.config.ts`

## Firebase SDK

### Install Firebase packages

```bash
npm install firebase firebase-admin
yarn install   # sync yarn.lock — App Hosting builds with --frozen-lockfile
```

### Create `src/lib/firebase.ts`

Client-side Firebase config reading from `NEXT_PUBLIC_FIREBASE_*` env vars. Copy verbatim from `apps/client-portal/src/lib/firebase.ts` in `Admireworks Internal OS`.

### Create `src/lib/firebase-admin.ts`

Server-side Admin SDK init. Reads `FIREBASE_SERVICE_ACCOUNT_PATH` locally, reads secret from App Hosting in production.

## App Hosting Config

### Create `apphosting.yaml`

At repo root (standalone) or at `apps/<app-name>/apphosting.yaml` (monorepo):

```yaml
runConfig:
  concurrency: 80
  cpu: 1
  memoryMiB: 512
  minInstances: 0
  maxInstances: 2

env:
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    value: <public-api-key>
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: <project>.firebaseapp.com
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: <project-id>
  - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    value: <project>.firebasestorage.app
  - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    value: "<sender-id>"
  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: <app-id>
  # Secrets (values managed in App Hosting console)
  - variable: <SECRET_NAME>
    secret: <SECRET_NAME>
```

The `NEXT_PUBLIC_FIREBASE_*` values are safe to commit — they're client-facing anyway. All server secrets go under `secret:`, never `value:`.

### Create the App Hosting backend

In Firebase Console → App Hosting → Create backend:

- GitHub: `fnasr-source/<repo>`
- Live branch: `main`
- **App root directory** — for standalone: `/`. For monorepo: `apps/<app-name>`.
- Region: `europe-west4` (matches our other projects)

The "App root directory" field is the #1 thing that breaks silent — if builds fail with "no package.json found", this is always wrong.

## Firestore

### Create `firestore.rules`

Start with the most restrictive baseline:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Open up specific collections as you build them — never leave wildcard writes open in production.

### Create `firestore.indexes.json`

Empty array initially: `{"indexes": [], "fieldOverrides": []}`. Grow as composite queries need it.

### Create `firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

## Verification

### Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` — default Next.js page should render. Firebase SDK errors are OK until you've added a real auth user (workflow 04).

### First deploy

```bash
git add .
git commit -m "chore: initial scaffold"
git push origin main
```

App Hosting should auto-build and deploy within ~5 min. Check the backend URL in Firebase Console → App Hosting → Backends.

## Source of truth

- Scaffolding reference: `Basseqat/` at repo root (simplest layout)
- Monorepo apphosting.yaml: `Admireworks Internal OS/apps/playbooks/apphosting.yaml`
- Firebase SDK wiring: `Admireworks Internal OS/apps/client-portal/src/lib/firebase.ts`
- Global dependency-sync rule: `/Users/user/.claude/CLAUDE.md` → "Adding npm Dependencies" section
