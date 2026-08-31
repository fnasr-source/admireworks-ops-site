# Project Launch Master

The canonical, step-by-step playbook for spinning up any new Admireworks client project — from an empty GitHub repo to a live, observable, team-operable app. Every step references a real, working implementation in Basseqat, The Slim Game, or Edrak Space so the team copies from known-good code instead of reinventing.

Use this when you're the engineer kicking off a new client build. Read the README, then open the matching workflow file for each stage.

## How The Launch Is Structured

A new project goes through nine stages, in order. Each stage has its own workflow file under `workflows/`:

| # | Stage | Workflow |
|---|---|---|
| 00 | Kickoff | `workflows/00-kickoff.md` |
| 01 | Scaffolding | `workflows/01-scaffolding.md` |
| 02 | Admin UI Adoption | `workflows/02-admin-ui-adoption.md` |
| 03 | Secrets Management | `workflows/03-secrets.md` |
| 04 | Auth & Roles | `workflows/04-auth-and-roles.md` |
| 05 | Integrations Page | `workflows/05-integrations-page.md` |
| 06 | Sequences System | `workflows/06-sequences.md` |
| 07 | CI/CD | `workflows/07-ci-cd.md` |
| 08 | Content Compliance | `workflows/08-content-compliance.md` |

The final pre-launch gate lives as a checklist scope at `/scopes/project-launch-checklist` (source: `checklists/project-launch-checklist.md`).

## Source-of-Truth Convention

Every workflow ends with a **Source of truth** section listing the exact file(s) in Basseqat, Slim Game, or Edrak Space to copy from. The playbook explains *why* and *when*; the source file is the *what*. If the real code drifts, the playbook goes stale — so the team's job is to update the pointer or the real code, never to maintain a parallel copy.

## When Not To Use This

- **Not for existing clients.** This is a launch playbook, not a maintenance playbook.
- **Not for non-client internal tools.** Those don't need the full admin UI / integrations / sequences stack.
- **Not a replacement for `ops/direct-response-playbook/`.** That one is for the *marketing* work (offers, funnels, ads). This one is for the *engineering* work (repo, hosting, auth, CI).
