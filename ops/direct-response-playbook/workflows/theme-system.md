# Theme System SOP

This document describes the Tailwind 4 token-based theme system used across direct-response client projects. The reference implementation lives in The Slim Game (`apps/web/src/app/globals.css`).

---

## Architecture: Tailwind 4 `@theme inline`

Tailwind 4 introduced `@theme inline` as the replacement for `tailwind.config.js` color/spacing extensions. All design tokens are declared directly in CSS using CSS custom properties, and Tailwind generates utility classes from them automatically.

```css
@import "tailwindcss";

@theme inline {
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  --color-accent: var(--accent);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-muted: var(--muted);
  /* ... */
}
```

The pattern works in two layers:

1. **`@theme inline` block** -- Maps `--color-*` tokens that Tailwind reads into utilities like `bg-primary`, `text-foreground`, `border-border`.
2. **`:root` and `[data-theme="dark"]` blocks** -- Define the actual color values. Switching the `data-theme` attribute on the HTML element swaps the entire palette without changing any component code.

This means `bg-primary` resolves to `#C41E2A` in light mode and `#E8564A` in dark mode, with zero conditional logic in components.

---

## Light / Dark / Variant Mode Setup

### Dark Mode Custom Variant

Tailwind 4 uses a custom variant directive instead of config:

```css
@custom-variant dark (&:is([data-theme="dark"] *));
```

This means `dark:bg-card` activates when any ancestor has `data-theme="dark"`.

### Mode Definitions

| Mode | Selector | Character |
|---|---|---|
| Light (default) | `:root` | Clean, warm neutrals. Primary red, gold accent. |
| Dark | `[data-theme="dark"]` | Deep navy-blacks. Lighter primary red, same gold. |
| Variant (e.g. Mental Bariatric) | `.mb-dark` class | Warm dark tones with orange/gold accents. Premium sibling feel. |

To add a new variant for a different client product:
1. Create a new CSS class (e.g., `.client-variant`) with the full set of token overrides.
2. Apply that class to the wrapping element for those pages.
3. All existing `bg-primary`, `text-foreground`, etc. utilities adapt automatically.

---

## Arabic RTL-First Typography

### Font Stack

```css
@theme inline {
  --font-heading: var(--font-heading), 'Cairo', 'Tajawal', 'Noto Kufi Arabic', sans-serif;
  --font-sans: var(--font-sans), var(--font-dm-sans), 'Cairo', 'Tajawal', sans-serif;
  --font-mono: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
}
```

- **Cairo** -- Primary Arabic display font. Bold weights used for headings.
- **Tajawal** -- Secondary Arabic body font. Clean and readable at small sizes.
- **Noto Kufi Arabic** -- Fallback for maximum glyph coverage.

### RTL-First Base

```css
html {
  direction: rtl;
  font-family: var(--font-sans);
}
```

The entire app defaults to RTL. This is set once in the base layer. Components do not need to manage direction themselves.

### Arabic Line Height Standards

| Element | Line Height | Rationale |
|---|---|---|
| `body` | 1.75 | Relaxed base for Arabic body text. |
| `h1` | 1.35 | Slightly tighter for large display text but still readable. |
| `h2` | 1.4 | Standard Arabic heading line height. |
| `h3`-`h6` | 1.45 | Multi-line Arabic headings need more air than Latin. |
| `p` | 1.8 | Generous for Arabic paragraph readability. |
| Blog content | 2.0 | Extra breathing room for long-form Arabic reading. |

Arabic script has more vertical variation than Latin, so line heights are set 15-25% higher than a typical Latin-only system.

### Heading Base

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 700;
  color: var(--foreground);
  letter-spacing: -0.01em;
}
```

---

## Semantic Color Token Naming

### Core Tokens

| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| `--primary` | `#C41E2A` | `#E8564A` | Brand CTA, links, focus rings |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | Text on primary backgrounds |
| `--secondary` | `#D4A843` | `#D4A843` | Gold accent, secondary CTAs |
| `--accent` | `#D4A843` | `#D4A843` | Highlights, badges |
| `--background` | `#F8F7F5` | `#0F0F13` | Page background |
| `--foreground` | `#1A1A2E` | `#E5E7EB` | Primary text |
| `--card` | `#FFFFFF` | `#1A1A23` | Card/panel surfaces |
| `--muted` | `#F9FAFB` | `#22222E` | Subtle backgrounds |
| `--muted-foreground` | `#6B7280` | `#9CA3AF` | Secondary/label text |
| `--border` | `#E5E7EB` | `rgba(255,255,255,0.08)` | Borders, dividers |
| `--ring` | `#C41E2A` | `#C41E2A` | Focus ring |
| `--destructive` | `#DC2626` | `#EF4444` | Danger actions, delete |

### Status Tokens

| Token | Light | Dark |
|---|---|---|
| `--success` | `#059669` | `#10B981` |
| `--warning` | `#D97706` | `#FBBF24` |
| `--error` | `#DC2626` | `#EF4444` |

### Additional Surface Tokens

| Token | Purpose |
|---|---|
| `--table-alt` | Alternating table row background |
| `--divider` | Lighter-than-border divider lines |
| `--card-title` | Heading text within cards (slightly different from foreground) |
| `--popover` / `--popover-foreground` | Dropdown and tooltip surfaces |

---

## Admin Sidebar Token Conventions

The admin dashboard sidebar has its own isolated token set so it can be themed independently of the main content area.

| Token | Purpose |
|---|---|
| `--sidebar` | Sidebar background |
| `--sidebar-foreground` | Sidebar text |
| `--sidebar-primary` | Active item background/icon |
| `--sidebar-primary-foreground` | Active item text |
| `--sidebar-accent` | Hover/selected state background |
| `--sidebar-accent-foreground` | Hover/selected state text |
| `--sidebar-border` | Sidebar dividers |
| `--sidebar-ring` | Sidebar focus ring |
| `--sidebar-hover` | Row hover background |
| `--sidebar-section-label` | Section header text (uses primary color) |

Additionally, there are brand-green tokens for the admin dashboard:
- `--brand-green` -- Dark teal used for admin branding (`#2C5F56` light, `#3A7A6F` dark)
- `--brand-green-dark` -- Darker variant for hover states

---

## Component Patterns

### `btn-primary` -- 3D Squishy CTA

The primary call-to-action button uses a physical "press" effect with a thick bottom border and translate animation:

```css
.btn-primary {
  @apply bg-tsg-sage text-white px-8 py-4 rounded-xl font-black text-lg
         transition-all transform hover:-translate-y-1 hover:shadow-lg
         active:translate-y-0 active:shadow-sm border-b-4 border-[#1E7A45];
}
```

Key properties:
- `border-b-4` creates the 3D depth illusion.
- `hover:-translate-y-1` lifts the button on hover.
- `active:translate-y-0` presses it down on click.
- `font-black` ensures maximum weight for Arabic CTA text.

To adapt: Replace `bg-tsg-sage` and `border-[#1E7A45]` with the new client's CTA color and its darker shade.

### `btn-secondary` -- Outlined Brand Button

```css
.btn-secondary {
  @apply border-2 border-tsg-orange text-tsg-orange px-6 py-3 rounded-xl
         font-bold transition-all hover:bg-tsg-orange/5 hover:-translate-y-0.5;
}
```

Ghost button with a subtle background fill on hover. Uses the brand accent color for the outline.

### `brand-card` -- Standard Content Card

```css
.brand-card {
  @apply bg-card border border-border/50 rounded-2xl shadow-md p-6
         hover:shadow-xl transition-shadow duration-300;
}
```

Uses semantic tokens so it works in both light and dark mode automatically.

---

## Chart Tokens

Charts reuse the semantic palette to stay consistent:

```css
--color-chart-1: var(--primary);
--color-chart-2: var(--success);
--color-chart-3: var(--accent);
--color-chart-4: var(--warning);
--color-chart-5: var(--secondary);
```

---

## Shadow Scale

Shadows use a direct-response style (harder, more defined) rather than soft diffused shadows:

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

---

## Radius Scale

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;   /* MOND standard — used for cards and containers */
--radius-xl: 16px;
--radius-full: 9999px;
```

---

## How to Adapt for a New Client Brand

### Step 1: Replace `:root` values

Copy the `:root` block and replace the color values with the new client's brand palette. At minimum, update:
- `--primary` and `--primary-foreground`
- `--secondary` and `--secondary-foreground`
- `--accent`
- `--background` and `--foreground`

### Step 2: Create a `[data-theme="dark"]` override

If the client needs dark mode, define a full set of dark tokens. Follow the pattern of lightening primaries and darkening backgrounds.

### Step 3: Replace product-specific colors

The reference implementation includes product-specific tokens (e.g., `--color-tsg-orange`, `--color-tsg-sage`). Remove these and add the new client's brand-specific colors if needed for CTAs or product-specific pages.

### Step 4: Update the font stack

Replace 'Cairo', 'Tajawal', 'Noto Kufi Arabic' only if the client requires different Arabic fonts. For most MENA clients, this stack works well. For English-primary clients, put the Latin font first in the stack.

### Step 5: Update component classes

Review `btn-primary`, `btn-secondary`, and `brand-card` and update any hardcoded color references to use the new semantic tokens or new product-specific tokens.

### Step 6: Create product variants (if needed)

If the client has multiple products with distinct visual identities (like The Slim Game + Mental Bariatric), create additional CSS classes with full token overrides rather than creating separate stylesheets.

---

## Reference Implementation

- **Source file:** `apps/web/src/app/globals.css` in The Slim Game repo
- **Related SOP:** The brand asset replacement checklist in `ops/direct-response-playbook/workflows/multi-tenant-abstraction.md`
