# Project Launch Checklist

Pre-launch gate. Every item must be checked before the project goes live to real users. Each item links to the workflow where it's explained in detail.

The checklist is auto-rendered as a scope at `/scopes/project-launch-checklist` in the playbooks app.

## Items

- [ ] Project name locked — used consistently in repo, Firebase, Doppler, domain
- [ ] GitHub repo created at `fnasr-source/<name>` with team access
- [ ] Firebase project created, billing linked
- [ ] Service account JSON saved locally, gitignored, path added to `/Users/user/.claude/CLAUDE.md`
- [ ] `.firebaserc` committed
- [ ] `CLAUDE.md` written with all 13 standard sections
- [ ] Next.js app scaffolded with matching versions (Next 16.x, React 19.x, TS 5.9.x)
- [ ] `firebase.json`, `firestore.rules`, `firestore.indexes.json` present
- [ ] `apphosting.yaml` committed with correct env vars + secret bindings
- [ ] App Hosting backend created with correct App root directory
- [ ] First deploy succeeded, live URL loads
- [ ] Admin UI library adopted (17 components, CSS vars themed, RTL if needed)
- [ ] Doppler project created with dev/stg/prd configs
- [ ] GSM sync enabled, App Hosting service account has secretAccessor role
- [ ] `docs/SECRETS.md` written listing every secret + rotation owner
- [ ] `doppler run -- npm run dev` works locally
- [ ] Firebase Auth enabled with Google provider
- [ ] Break-glass email list added at `src/lib/break-glass.ts`
- [ ] `userProfiles` collection schema defined, first-sign-in provisioning route built
- [ ] `AuthContext` wraps the app, admin gate enforced on `/admin/*`
- [ ] Firestore rules explicit per collection, no wildcard writes
- [ ] Sign-in page at `/login` themed to brand
- [ ] Integrations page built if the project needs external services
- [ ] WhatsApp webhook HMAC verification implemented (if WhatsApp used)
- [ ] Sequences data model in Firestore (if sequences needed)
- [ ] Sequence admin UI + runner cron wired (if sequences needed)
- [ ] Sequence tester run end-to-end with real email + real WhatsApp number
- [ ] GitHub Actions `deploy.yml` committed with TypeScript + rollout jobs
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` + `FIREBASE_PROJECT_ID` secrets set in GitHub
- [ ] First auto-deploy from main succeeded
- [ ] Content compliance linter installed if Arabic-facing
- [ ] Forbidden-copy config reviewed with brand/legal
- [ ] Deployment monitoring enrolled in `monitoring-log.md`
- [ ] GA4 configured, Measurement ID in CLAUDE.md
- [ ] Meta Pixel installed and firing (if marketing traffic expected)
- [ ] Microsoft Clarity installed (session recording)
- [ ] Sentry DSN configured (error monitoring)
- [ ] Domain connected in App Hosting → Domains
- [ ] Client-facing emails tested end-to-end (Resend)
- [ ] Stakeholder walkthrough recorded, access granted, credentials handed off
