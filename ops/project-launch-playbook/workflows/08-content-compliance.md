# Project Launch — Content Compliance

Arabic-facing projects have two content hazards: (1) phrases that fail brand voice ("guaranteed returns", hype language) and (2) phrases that fail legal/financial disclaimer rules. Basseqat ships a CI linter that blocks merges containing forbidden phrases. Every Arabic-facing project should adopt it.

Skip this workflow for English-only internal tools or MVP-only projects that will iterate fast.

## What The Linter Does

### Scans source files for banned phrases

The linter reads a configurable list of forbidden substrings (exact match, case-insensitive) and scans all `.tsx`, `.ts`, `.md` files under the project. Any match blocks CI.

It runs in two places:

- **Locally** as a pre-commit hook (optional)
- **In CI** as a required check before Firestore rules or App Hosting rollout

## Configure

### Create `scripts/check-forbidden-copy.mjs`

Copy verbatim from `Basseqat/scripts/check-forbidden-copy.mjs`. It's ~50 lines and has no dependencies.

### Create the forbidden list

At `content/forbidden-copy.json` (or similar):

```json
{
  "phrases": [
    "مضمون",
    "100%",
    "ضمان الربح",
    "guaranteed returns",
    "get rich quick"
  ],
  "allowedExceptions": [
    "docs/historical/old-proposal.md"
  ]
}
```

Per-project the list will differ. Basseqat's list focuses on financial/investment disclaimers. The Slim Game's would focus on weight-loss claim wording. Build with the client's legal/brand team.

### Required phrases

The same linter can also check for *required* phrases — e.g., "هذا الاستثمار يحمل مخاطر" must appear on every landing page for Basseqat. Extend the config:

```json
{
  "requiredOnPages": {
    "src/app/p/*": ["هذا الاستثمار يحمل مخاطر"]
  }
}
```

## Wire Into CI

### Add to `deploy.yml`

The content lint runs before TypeScript check so authors see the simplest failure first:

```yaml
lint-content:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v5
      with:
        node-version: '20'
    - run: node scripts/check-forbidden-copy.mjs

typecheck:
  needs: [lint-content]
  runs-on: ubuntu-latest
  # ...
```

### Optional: pre-commit hook

In `package.json`:

```json
{
  "scripts": {
    "precommit:check": "node scripts/check-forbidden-copy.mjs"
  }
}
```

Wire to Husky or leave as opt-in. Forcing pre-commit hooks on the whole team causes more friction than value — the CI check is the real gate.

## Using The Existing Skill

### Arabic copy review skill

A skill `arabic-copy-review` exists in the Claude config (see `/Users/user/.claude/`). Invoke it when reviewing new Arabic content before commit — it catches nuance the substring linter misses (tone, Egyptian vs MSA dialect, grammatical agreement).

The linter is the *hard* gate. The skill is the *soft* review. Use both.

## When The Linter Blocks You

### Legitimate exception

Sometimes forbidden phrases are genuinely correct (quoting a source, historical content, analytics copy that happens to match). Add the file path to `allowedExceptions` in the config, commit with a `chore:` note explaining why.

### Linter is wrong

If the phrase is actually fine and the rule should be relaxed, update the config, run past the brand lead, and commit the config change in the same PR as the content.

Never bypass the linter with `--no-verify` or by disabling the CI job. Fix the root cause.

## Source of truth

- Linter script: `Basseqat/scripts/check-forbidden-copy.mjs`
- Config format: `Basseqat/content/forbidden-copy.json`
- CI integration: `Basseqat/.github/workflows/deploy.yml` → `lint-content` job
- Skill: `/Users/user/.claude/skills/arabic-copy-review.md`
