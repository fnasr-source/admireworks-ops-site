# Project Launch — Admin Navigation Catalog

Every Admireworks admin surface shares the same navigation shape: a single
typed catalog in `lib/admin/navigation.ts` that the sidebar, mobile
bottom-nav, and drawer all consume. This eliminates ad-hoc nav arrays in
layout files and keeps the rendering code framework-free.

**Canonical reference implementations:**
- `Basseqat/apps/web/src/lib/admin/navigation.ts` (Tailwind + lucide-react)
- `Mond/apps/web/src/lib/admin/navigation.ts` (vanilla CSS + lucide-react)

Both files share the same shape — only the icon set, labels, and section
IDs differ.

## The Shape

```ts
export type AdminSectionId =
  | 'dashboard' | 'sales' | 'delivery' | 'marketing' | 'messaging' | 'system';

export interface AdminNavItem {
  kind: 'item';
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  section: AdminSectionId;
  description?: string;
  capability?: AdminCapability; // gates visibility via access-policy.ts
}

export interface AdminNavGroup {
  kind: 'group';
  id: string;
  label: string;
  icon: LucideIcon;
  section: AdminSectionId;
  children: AdminNavItem[];
}

export type AdminNavEntry = AdminNavItem | AdminNavGroup;

export function isNavGroup(entry: AdminNavEntry): entry is AdminNavGroup {
  return entry.kind === 'group';
}
```

The discriminated union means one rendering function handles both items and
groups with a type-safe branch. **Never** replace this with a looser shape —
the narrowing is what keeps the sidebar maintainable.

## Section IDs

Six canonical sections. Do not invent new section IDs per project; if a new
section is genuinely needed across two+ projects, propose the addition here
first.

| Section | Purpose |
|---|---|
| `dashboard` | KPIs, overview, single top-level landing |
| `sales` | Pre-contract: leads, pipeline, scoring |
| `delivery` | Post-contract: clients, projects, approvals, billing |
| `marketing` | Ads, sequences, campaigns, insights |
| `messaging` | Conversational channels: WhatsApp, Telegram, AI monitor |
| `system` | Configuration: integrations, team, settings |

Some projects may not populate every section (a lead-only CRM has no
`delivery`). That's fine — the sidebar hides sections with zero visible
entries.

## Groups vs Standalone Items

Rule of thumb: **3+ related leaves under the same section → group them.**

Good group examples:
- `billing` group in `delivery`: subscriptions + invoices + pricing
- `ai` group in `messaging`: ai-monitor + ai-settings

Bad group examples:
- A group with one child (just make it standalone)
- Groups spanning sections (groups are always intra-section)

## Capability-Gated Visibility

Every item should declare the minimum capability required to see it. The
sidebar filters entries via `capabilities.has(item.capability)`. Omit the
capability field only when the item is visible to every authenticated admin
(rare — usually the dashboard).

Groups are visible when any child is visible. If every child is gated and
the user lacks all gating capabilities, the group disappears.

## Exports

Every navigation file must export:

```ts
export const adminNavEntries: AdminNavEntry[];      // grouped — for sidebar
export const adminNavItems: AdminNavItem[];         // flat — for breadcrumbs / deep links
export const mobilePriorityNavIds: readonly string[]; // 4 items for bottom nav
export const ADMIN_SECTION_LABEL: Record<AdminSectionId, string>;
export const ADMIN_SECTION_ORDER: AdminSectionId[];
export function findNavItemByPath(pathname: string): AdminNavItem | undefined;
export function findParentGroupId(itemId: string): string | null;
```

The flat `adminNavItems` is derived, not authored — always flatten from
`adminNavEntries` at export time so the two stay in sync.

## Mobile Priority-4

Pick four items for the mobile bottom-nav based on **daily operator
workflow**, not frequency of features shipped. The morning-review loop:

1. Dashboard (what happened overnight?)
2. Leads (new inbound?)
3. WhatsApp (active conversations?)
4. Delivery or Clients (what's due today?)

Don't put Settings or Integrations on the bottom nav. Those are
configuration surfaces, not daily-use tools.

## Icons

Use lucide-react at `strokeWidth={1.5}`. This matches the "numerals +
hairlines + 1px geometric shapes" brand direction. Heavier stroke widths
feel off in the admin chrome.

When a Lucide icon doesn't exist for the concept, **pick the nearest
metaphor** rather than composing inline SVG. Consistent icon weight matters
more than semantic perfection.

## Adding a New Nav Entry: 4-Step Checklist

1. Add the entry to `adminNavEntries` in the right section + group.
2. Add its route page under `app/admin/…/page.tsx` (even as a placeholder).
3. Add the capability to `access-policy.ts` if new, and wire it to every
   role that should see the entry.
4. If the entry needs to appear on mobile bottom-nav, add its `id` to
   `mobilePriorityNavIds` and remove the least-used current entry.

## Anti-Patterns

- **Do not** hardcode nav arrays inside `layout.tsx`. Always read from the
  catalog.
- **Do not** duplicate the catalog for mobile vs desktop. One source, two
  renderers.
- **Do not** use emoji prefixes in labels for "flavor." Use Lucide icons.
