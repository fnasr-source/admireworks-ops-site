# Project Launch — CI/CD

Every project uses the same pipeline: push to `main` → TypeScript check → Firestore rules deploy → Cloud Functions deploy (if any) → App Hosting rollout. The GitHub Actions workflow is templatable; copy from an existing project and edit the backend name.

By the end of this workflow every push to `main` auto-deploys without manual intervention.

## GitHub Secrets

### Required secrets

In GitHub repo → Settings → Secrets and variables → Actions:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — paste the service account JSON content (the whole file as a string)
- `FIREBASE_PROJECT_ID` — e.g., `basseqat-e8e95`

That's it. App Hosting rollouts use `firebase-tools` authenticated via the service account; no other secrets needed.

## Workflow File

### Create `.github/workflows/deploy.yml`

Structure:

```yaml
name: Deploy
on:
  push:
    branches: [main]

env:
  PROJECT_ID: <firebase-project-id>

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  lint-content:
    # Only if the project has a content compliance linter (workflow 08)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v5
      - run: node scripts/check-forbidden-copy.mjs

  firestore-rules:
    needs: [typecheck]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - name: Set up service account
        run: echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}' > /tmp/sa.json
      - name: Deploy rules + indexes
        env:
          GOOGLE_APPLICATION_CREDENTIALS: /tmp/sa.json
        run: npx firebase-tools deploy --only firestore --project ${{ env.PROJECT_ID }} --non-interactive

  apphosting:
    needs: [typecheck]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - name: Set up service account
        run: echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}' > /tmp/sa.json
      - name: Trigger rollout
        env:
          GOOGLE_APPLICATION_CREDENTIALS: /tmp/sa.json
        run: |
          timeout 120 npx firebase-tools apphosting:rollouts:create <backend-name> \
            --project ${{ env.PROJECT_ID }} \
            --git-branch main \
            --non-interactive || echo "Rollout may be in progress; check Console"
```

Replace `<backend-name>` with the App Hosting backend name set up in workflow 01.

### Multi-backend monorepo

For monorepos with multiple App Hosting backends (e.g., `Admireworks Internal OS` with `client-portal`, `internal-ops`, `playbooks`), repeat the rollout step per backend. See `Admireworks Internal OS/.github/workflows/deploy.yml`.

## Cron Jobs

### Register crons in App Hosting

If sequences (workflow 06) or other recurring jobs are needed:

```yaml
# apphosting.yaml
runConfig:
  # ...

scheduler:
  - name: sequences-tick
    schedule: "*/5 * * * *"   # every 5 min
    path: /api/cron/sequences/tick
    httpMethod: POST
```

Every cron endpoint must verify a shared secret header (`x-cron-secret` matching a GSM secret) to prevent unauthorized triggering.

## Deployment Monitoring

### Enroll the project in hourly health checks

Add the project to the `monitoring-log.md` system:

1. Update `Admireworks Internal OS/monitoring-log.md` with project name
2. Add a block to the hourly scheduled agent's config listing the workflows to monitor
3. Failures auto-create a fix PR or a `[NEEDS ATTENTION]` Gmail draft

Reference: `Admireworks Internal OS/CLAUDE.md` → "Deployment Monitoring" section.

## Known Pitfalls

- **Yarn lockfile sync** — if you run `npm install <pkg>`, immediately run `yarn install` and commit both lockfiles. App Hosting builds with `yarn install --frozen-lockfile`. Documented in `/Users/user/.claude/CLAUDE.md`.
- **`firebase deploy` timeouts** — the rollout command sometimes hangs even when the build succeeds. The 120s `timeout` wrapper + explicit "check Console" message handles this.
- **Stale builds** — if App Hosting shows a green build but the site serves old content, the CDN might be cached. Trigger a fresh rollout or purge manually.
- **Don't use `--no-verify`** — never bypass pre-commit hooks. If one fails, fix the underlying issue.

## First Deploy Verification

### Make a trivial change and push

Edit the homepage headline. `git commit`, `git push origin main`. Watch:

1. GitHub Actions tab — all jobs green
2. Firebase Console → App Hosting → Rollouts tab — new rollout succeeds
3. Live URL — new headline visible within ~5 min

If any step fails, fix before moving on. This is the baseline every future deploy will retrace.

## Source of truth

- Monorepo deploy.yml: `Admireworks Internal OS/.github/workflows/deploy.yml`
- Standalone deploy.yml: `Basseqat/.github/workflows/deploy.yml`
- Coverage per project: `/Users/user/.claude/CLAUDE.md` → "GitHub Actions Coverage Per Project" table
- Yarn/npm dependency rule: `/Users/user/.claude/CLAUDE.md` → "Adding npm Dependencies"
