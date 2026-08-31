# Project Launch — Kickoff

The first 60 minutes of a new project. By the end of this workflow you have a named project, a GitHub repo, a Firebase project, and a CLAUDE.md file that tells the next engineer (human or AI) what's going on.

## Naming

### Choose the project name

Pick a single short name used everywhere: repo, Firebase project, env vars, Doppler, domain. Lowercase, no spaces, no abbreviations that aren't already the brand. Examples that worked: `basseqat`, `mond`, `edrak-space`, `qafza-app`.

If the client name has a suffix like "app" or "platform", decide once and commit — renames cost a day.

### Register the project in the catalog

Add a row to `docs/PROJECT-CATALOG.md` (in `Admireworks Internal OS`) with the name, purpose, and owner. This is the index the team uses to find any project.

## GitHub Repository

### Create the repo

Create `fnasr-source/<project-name>` on GitHub. Default branch = `main` (not `master`) unless matching an existing convention.

Initialize with `.gitignore` for Node, an empty README, and no license file (ours are private).

### Grant team access

Add the team GitHub group. Do not add individual collaborators — use the group so onboarding/offboarding happens in one place.

## Firebase Project

### Create the Firebase project

Google Cloud Console → New Project. Name: `<project-name>` (or closest available — Firebase appends random digits on collisions). Link billing to the Admireworks billing account.

Enable: Firestore, Authentication, Storage, App Hosting. Do not enable Realtime Database unless you specifically need it.

### Download the service account JSON

Project Settings → Service Accounts → Generate new private key. Save to `<project-name>/firebase/service-account.json` locally. **Never commit it** — add `firebase/service-account.json` to `.gitignore` immediately.

Add the file path to the "Known Projects" table in `/Users/user/.claude/CLAUDE.md` so future sessions can find it.

### Set up `.firebaserc`

Create `.firebaserc` at repo root:

```json
{
  "projects": { "default": "<firebase-project-id>" }
}
```

Use the real Firebase project ID, which may include trailing random digits.

## Branch & CI Strategy

### Default branch and protection

`main` is the live branch — pushes auto-deploy. Enable branch protection: require PR reviews for anyone who isn't the repo owner, require status checks (TypeScript, lint) to pass before merge.

### Commit conventions

No enforced format, but prefer lowercase conventional-style prefixes: `feat:`, `fix:`, `chore:`, `docs:`. Keep messages under 72 chars for the summary line.

## CLAUDE.md

### Write the project CLAUDE.md

Create `CLAUDE.md` at repo root. Minimum sections:

1. Project purpose (2-3 sentences)
2. Stack (copy from an existing CLAUDE.md and edit)
3. Firebase project ID
4. Default branch + repo URL
5. Live domain(s)
6. Deployment flow
7. Environment variables (names only, not values)
8. Key routes
9. Auth model
10. Tracking setup (GA4, Meta Pixel, Clarity, Sentry)
11. Brand tokens (colors, fonts)
12. Known pitfalls
13. Deployment monitoring (see `workflows/07-ci-cd.md`)

Reference files: `Basseqat/CLAUDE.md`, `The Slim Game/CLAUDE.md`, `Edrak Space/CLAUDE.md` — copy the structure from whichever most resembles the new project.

## Source of truth

- Existing CLAUDE.md examples: `Basseqat/CLAUDE.md`, `The Slim Game/CLAUDE.md`, `Edrak Space/CLAUDE.md`
- Known Projects table: `/Users/user/.claude/CLAUDE.md`
- Project catalog: `Admireworks Internal OS/docs/PROJECT-CATALOG.md`
