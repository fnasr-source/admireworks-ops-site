# Project Launch — Admin UI Adoption

Every Admireworks admin panel shares the same component library — originated in Edrak Space, adopted by Slim Game, ported to Basseqat. Using the shared library means a team member can move between admin panels without relearning buttons, tables, and layouts.

By the end of this workflow the new project has the 17 canonical admin components installed, themed with the client's brand colors, and working in RTL if Arabic-facing.

> **Related workflows for the full renovation:**
> - [`03-admin-navigation-catalog.md`](./03-admin-navigation-catalog.md) — typed nav tree + sidebar / mobile bottom-nav renderers.
> - [`04-admin-integrations-hub.md`](./04-admin-integrations-hub.md) — `/admin/integrations` catalog pattern with credential drawer.
> - [`05-admin-access-policy.md`](./05-admin-access-policy.md) — 3-tier auth resolver, role → capability matrix, `INTERNAL_ONLY_CAPABILITIES` filter.
>
> **Styling fork:** the 17-component library in this workflow is Tailwind-based (Edrak → Slim Game → Basseqat lineage). MOND (`Mond/apps/web/src/components/admin/`) is the vanilla-CSS fork — same components, same tokens, no Tailwind. Pick the fork that matches the target project's styling constraint; the navigation + integrations + access patterns above apply to both.

## What To Copy

### The 17 canonical components

From `Edrak Space/apps/web/src/components/admin/ui/`:

- `Button.tsx` — variants: primary, secondary, ghost, destructive
- `Badge.tsx` — status pills
- `Input.tsx` — text inputs with error state
- `Select.tsx` — native select wrapper
- `Breadcrumb.tsx` — page nav
- `DataTable.tsx` — sortable, paginated table
- `FilterBar.tsx` — table filter controls
- `Skeleton.tsx` — loading placeholder
- `Spinner.tsx` — loading indicator
- `StatCard.tsx` — dashboard metric card
- `AdminPageHeader.tsx` — page title + actions row
- `AdminPageShell.tsx` — page layout wrapper
- `AdminStateCard.tsx` — empty/error/success state
- `AdminPanel.tsx` — card-style container
- `AdminDataState.tsx` — loading/error/empty wrapper for data sections
- `MondSignature.tsx` — "Managed by MOND" footer (only for MOND-branded projects)
- `MondDiamond.tsx` — MOND diamond accent (same caveat)

**Skip MondSignature and MondDiamond** unless the project is a MOND venture. For AW-direct clients (Basseqat, etc.) they're wrong.

### Copy with attribution

Each file copied retains a header comment:

```ts
/**
 * Adopted from Edrak Space admin UI library.
 * Source: Edrak Space/apps/web/src/components/admin/ui/<ComponentName>.tsx
 * Do not edit in place — propose changes back to Edrak Space first.
 */
```

This prevents drift. When Edrak Space ships a fix, every adopting project patches from one place.

## Dependencies

### Install the three peer deps

```bash
npm install class-variance-authority clsx lucide-react
yarn install
```

The admin UI library depends on exactly these three — no more. If a new component starts needing something else, push back.

## Theming

### Set CSS variables

The components read theme from CSS custom properties. In `src/app/globals.css`:

```css
:root {
  --primary: <brand-primary-hex>;
  --primary-foreground: #ffffff;
  --accent: <brand-accent-hex>;
  --accent-foreground: #000000;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --background: #ffffff;
  --foreground: #0f172a;
  --border: #e2e8f0;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
}
```

Brand token mapping:
- Admireworks direct client → `--primary: #001a70` (Navy), `--accent: #cc9f53` (Gold)
- Basseqat → its own brand (check `Basseqat/apps/web/src/app/globals.css`)
- MOND venture → MOND palette

### RTL support

If the project serves Arabic-speaking users, set `dir="rtl"` on `<html>` in `src/app/layout.tsx` for Arabic routes. Admin components are RTL-tested by default; if one breaks, it's a bug in the component — fix in Edrak Space first, then re-pull.

## Admin Layout

### Create `src/app/admin/layout.tsx`

Use `AdminPageShell` as the top-level wrapper. Include nav, sign-out, and the role-gate (see workflow 04). Reference: `Edrak Space/apps/web/src/app/admin/layout.tsx`.

### First admin page

Build one concrete page first — usually `/admin/leads` — so you prove the components, theme, and nav all work end-to-end before copying the whole admin surface.

## Source of truth

- Canonical library: `Edrak Space/apps/web/src/components/admin/ui/`
- Canonical docs: `Edrak Space/docs/admin-ui.md`
- Adoption example: `The Slim Game/apps/web/src/components/admin/ui/` (adopted 9 components, April 10 2026)
- Access guide: `Edrak Space/docs/ADMIN_ACCESS_GUIDE.md`
