# Spatial System — WebClient Design Tokens and Primitives

This document describes the spatial design system for `OneMoreTaskTracker.WebClient`.
It covers the token vocabulary, the row-height scale, the breakpoint scale, and
the `<Gutter>` layout primitive that lives in `src/common/ds/spatial/`.

---

## 1. Spacing Scale (`--space-*`)

All layout margins, paddings, and gaps MUST use the spacing tokens.
Hard-coded rem values are a code smell; replace them with a token from this table.

| Token          | Value  | Pixels |
|----------------|--------|--------|
| `--space-1`    | 0.25rem | 4px   |
| `--space-2`    | 0.5rem  | 8px   |
| `--space-2-5`  | 0.625rem | 10px |
| `--space-3`    | 0.75rem | 12px  |
| `--space-3-5`  | 0.875rem | 14px |
| `--space-4`    | 1rem    | 16px  |
| `--space-6`    | 1.5rem  | 24px  |
| `--space-8`    | 2rem    | 32px  |

Usage:

```css
padding: var(--space-4) var(--space-6);
gap: var(--space-2);
margin-top: var(--space-8);
```

When no token matches a required value, introduce a new token in
`src/common/styles/tokens.css` and document it in this table. Never mint a
one-off literal in a component file.

---

## 2. Row-Height Scale (`--row-h-*`)

Row-height tokens encode the vertical rhythm of list rows and Gantt rows.
They must be used wherever a component defines an explicit row height or
`min-height` for a list item, table row, or Gantt track row.

| Token             | Value  | Use                                   |
|-------------------|--------|---------------------------------------|
| `--row-h-compact` | 2rem   | Dense list rows, secondary track rows |
| `--row-h-default` | 2.5rem | Standard list and grid rows           |
| `--row-h-feature` | 3.5rem | Feature rows with sub-content         |
| `--row-h-nav`     | 3rem   | Navigation items                      |

Usage:

```css
min-height: var(--row-h-default);
height: var(--row-h-compact);
```

The `--row-h-*` names intentionally mirror the `GutterDensity` variants so that
a `<Gutter density="compact">` wrapper and its row token stay in semantic sync.

---

## 3. Breakpoint Scale (`--bp-*`)

Breakpoint tokens define the project-wide responsive thresholds.
Use them in `@media` queries rather than bare pixel values.

| Token      | Value  | Description              |
|------------|--------|--------------------------|
| `--bp-sm`  | 640px  | Small — mobile landscape |
| `--bp-md`  | 768px  | Medium — tablet portrait |
| `--bp-lg`  | 1024px | Large — desktop          |
| `--bp-xl`  | 1280px | Extra-large — wide       |

Usage in CSS (custom properties cannot appear inside `@media` conditions
directly, so the values are documented here as the canonical source of truth;
use the pixel value in the query but note it against the token name in a
comment):

```css
/* --bp-md = 768px */
@media (min-width: 768px) {
  .my-component {
    flex-direction: row;
  }
}
```

When a query threshold changes, update `tokens.css` and search for the old
pixel literal across all CSS files.

---

## 4. `<Gutter>` Primitive

`Gutter` is a CSS-grid row primitive. It provides a named-column grid that
keeps left-panel rows of the Gantt chart (and any future tabular view) aligned
on a shared axis without brittle `margin-left` calculations.

### Location

```
src/common/ds/spatial/Gutter/Gutter.tsx   <- source of truth
src/common/ds/spatial/Gutter/Gutter.css   <- grid layout styles
src/common/ds/spatial/Gutter/index.ts     <- local barrel
src/common/ds/spatial/index.ts            <- sub-namespace barrel
```

The legacy path `src/pages/Gantt/components/GanttGutter/` now re-exports from
the canonical location above. No file in `GanttGutter/` contains logic.

### API

```typescript
export type GutterColumn = 'code' | 'label' | 'owner' | 'dates';
export type GutterDensity = 'compact' | 'default' | 'feature' | 'nav';

export interface GutterProps {
  columns: GutterColumn[];
  density?: GutterDensity;       // default: 'default'
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function Gutter(props: GutterProps): JSX.Element
```

`data-columns` and `data-density` are set as HTML attributes on the root `div`
so CSS selectors can target specific configurations without extra class names.

### Density and row-height alignment

| `density` prop | Matching `--row-h-*` token |
|----------------|---------------------------|
| `compact`      | `--row-h-compact`         |
| `default`      | `--row-h-default`         |
| `feature`      | `--row-h-feature`         |
| `nav`          | `--row-h-nav`             |

---

## 5. When to Consume

### Use spatial tokens (`--space-*`, `--row-h-*`, `--bp-*`)

Every CSS file in the project that declares margins, paddings, gaps, heights,
or responsive breakpoints MUST use a token from this system. Migrate existing
bare-rem literals to tokens when you touch a file (Boy Scout Rule).

### Use `<Gutter>` for multi-column row layout

Import from the sub-namespace barrel (not the top-level DS barrel, which is
frozen):

```typescript
import { Gutter } from '../../common/ds/spatial';
// or from within the spatial subtree:
import { Gutter } from './Gutter';
```

Use `<Gutter>` when:
- A row component must align named columns (`code`, `label`, `owner`, `dates`)
  with sibling rows in the same view.
- The row must switch height via a `density` prop rather than a separate CSS class.

Do NOT use `<Gutter>` for:
- Free-form card or flex layouts that do not need column alignment.
- Single-column stacks — a plain `div` with spacing tokens is sufficient.

---

## 6. Migration Checklist

When touching any component CSS file, apply these checks before committing:

- [ ] All `padding` / `margin` / `gap` values use `var(--space-*)`.
- [ ] All explicit row heights use `var(--row-h-*)`.
- [ ] `@media` breakpoint values are annotated with the matching `--bp-*` token.
- [ ] New multi-column row components use `<Gutter>` instead of manual grid CSS.
- [ ] No new tokens are introduced outside `tokens.css`.
