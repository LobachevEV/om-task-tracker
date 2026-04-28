---
name: OneMoreTaskTracker
description: A control-room view of GitLab merge requests and feature pipelines — calm precision, no Jira blue, dark by default.
colors:
  bg: "oklch(0.12 0.010 60)"
  surface: "oklch(0.16 0.008 60)"
  elevated: "oklch(0.20 0.007 60)"
  border: "oklch(0.24 0.006 60)"
  border-strong: "oklch(0.32 0.006 60)"
  text: "oklch(0.94 0.005 60)"
  text-muted: "oklch(0.65 0.008 60)"
  text-dim: "oklch(0.50 0.008 60)"
  accent: "oklch(0.75 0.14 85)"
  accent-hover: "oklch(0.80 0.14 85)"
  accent-ink: "oklch(0.18 0.02 85)"
  accent-dim: "oklch(0.75 0.14 85 / 0.15)"
  state-not-started: "oklch(0.40 0.006 60)"
  state-in-dev: "oklch(0.75 0.14 85)"
  state-mr-release: "oklch(0.72 0.10 190)"
  state-in-test: "oklch(0.68 0.12 250)"
  state-mr-master: "oklch(0.70 0.10 300)"
  state-completed: "oklch(0.65 0.10 145)"
  danger: "oklch(0.65 0.14 25)"
  warning: "oklch(0.75 0.14 85)"
  success: "oklch(0.65 0.10 145)"
typography:
  display:
    fontFamily: "Geologica, sans-serif"
    fontSize: "3.2rem"
    fontWeight: 500
    lineHeight: 1.1
    fontVariation: "'wdth' 78, 'wght' 500"
  headline:
    fontFamily: "Geologica, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Geologica, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'ss01', 'tnum'"
  label:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    fontFeature: "'tnum'"
rounded:
  field: "0.75rem"
  card: "1rem"
  pill: "999px"
  square: "6px"
  dialog: "10px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0.65rem 1.3rem"
    height: "44px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.1rem"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
  field-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "0.5rem 0.75rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "16px"
  dialog:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
    padding: "24px"
  badge-pill:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    typography: "{typography.label}"
  status-dot:
    rounded: "{rounded.pill}"
    width: "6px"
    height: "6px"
---

# Design System: OneMoreTaskTracker

## 1. Overview

**Creative North Star: "The Control Room at 02:00."**

The interface is a release-night dashboard — a 27-inch monitor in a dim room, an SRE or PM watching a feature pipeline cross five bounded contexts. Every pixel earns its place against that scene. Density is high but the surface stays calm: warm graphite neutrals, one warm-amber accent, and a state palette that doubles as the only place color is allowed to do work. The system treats decoration as a tell that the design is hiding from the data.

It rejects everything its category reflexively reaches for. No Jira blue. No Linear/Trello pastel cards. No MS Project gridline gloom. No SaaS hero screens, no gradient text, no card-grid landing-page aesthetic. The tradition it stands inside is the engineering instrument: a Bloomberg terminal, a tracker on an SRE's desk, the trim of a TUI like btop. Color reads as *temperature* — warm graphite, warm amber — never as *paint*.

**Key Characteristics:**
- Dark by default; light is a render target for exports, never a parity surface.
- Restrained color strategy: tinted neutrals + one accent + a six-hue state palette used only inside the pipeline-stage system.
- Bilingual first (Russian primary, English mirror); every face ships first-class Cyrillic.
- Sticky data, scrolling time. The Plan view's 280 px gutter holds identity steady while the timeline pans under it.
- Dense layout, varied rhythm. Same padding everywhere is the monotony tell.
- WCAG 2.2 AA floor; `prefers-reduced-motion` is honoured by the codebase, not the spec.

## 2. Colors: The Warm-Graphite Console

A Restrained palette: tinted graphite neutrals carry 90%+ of every surface; one warm-amber accent does the lifting on primary actions and active states; a six-hue state palette rides on top, used only inside the pipeline-stage system, never as decoration. Chroma stays under 0.012 across all neutrals so the warm tint reads as temperature, not color.

### Primary

- **Warm Amber** (`oklch(0.75 0.14 85)`): primary action, active toggle, today hairline, in-dev state. Reads as a precision instrument (engineering scale, warning indicator) without being loud. It does **not** read as "alert" — alerts use Danger below.
- **Amber Ink** (`oklch(0.18 0.02 85)`): text on amber surfaces. The only place near-black is allowed.
- **Amber Hover** (`oklch(0.80 0.14 85)`): hover state for primary surfaces. A 0.05 lightness lift, no chroma shift.

### Neutral (warm graphite)

- **BG** (`oklch(0.12 0.010 60)`): page background. Warm enough to feel inhabited, never blue.
- **Surface** (`oklch(0.16 0.008 60)`): panel and card surface — the default for everything not on `BG`.
- **Elevated** (`oklch(0.20 0.007 60)`): popovers, dropdowns, drawers, dialog body.
- **Border** (`oklch(0.24 0.006 60)`): 1 px dividers, table rules, default field border.
- **Border-Strong** (`oklch(0.32 0.006 60)`): focus and hover outline on inputs and secondary buttons.
- **Text** (`oklch(0.94 0.005 60)`): primary text. Never `#fff`.
- **Text-Muted** (`oklch(0.65 0.008 60)`): secondary labels, hints, table-cell meta.
- **Text-Dim** (`oklch(0.50 0.008 60)`): rarely-needed third tier — disabled labels, ghost placeholders.

### State Palette (pipeline stages)

Used by `GanttSegmentedBar`, `GanttStageSubRow`, role badges, and status chips. Each hue is paired with an icon or position so the palette survives color-vision deficiencies — color is a reinforcement, not the only signal.

- **Not Started** (`oklch(0.40 0.006 60)`): neutral graphite — work has not begun.
- **In Dev** (`oklch(0.75 0.14 85)`): warm amber — the active stage.
- **MR to Release** (`oklch(0.72 0.10 190)`): teal — in transit.
- **In Test** (`oklch(0.68 0.12 250)`): slate-blue — under review.
- **MR to Master** (`oklch(0.70 0.10 300)`): muted violet — final gate.
- **Completed** (`oklch(0.65 0.10 145)`): muted green — done.

### Feedback

- **Danger** (`oklch(0.65 0.14 25)`): error surfaces, destructive confirms, failed signal dots.
- **Warning** (`oklch(0.75 0.14 85)`): soft warning callouts. Equal to amber by design — a warning *is* an attention call.
- **Success** (`oklch(0.65 0.10 145)`): confirmation flashes, clear signal dots.

### Named Rules

**The Two-Layer Color Rule.** Color appears in two layers and two only: (a) neutrals + the single amber accent, used on the chrome; (b) the state palette, used inside the pipeline visual system. Anything that wants color outside those layers is decoration and gets refused.

**The No-Cyan-on-Dark Rule.** Any cyan-on-dark or cyan-to-green gradient lineage — the AI-tooling cliché — is the explicit anti-direction. Replace on sight.

**The OKLCH-Only Doctrine.** Tokens are authored in OKLCH. Never use `#000` or `#fff`; tint every neutral toward the warm-graphite hue (60). Stitch's linter will warn on the OKLCH frontmatter — accept the warning; the doctrine matters more than the lint.

## 3. Typography

**Display Font:** Geologica (with system sans fallback). Geometric variable, full Cyrillic. The condensed axis (`wdth 78, wght 500` is the heading default) carries a Plan-view gutter title in 280 px without truncating Russian compounds.
**Body Font:** Onest (with `system-ui` fallback). Variable grotesque designed with Cyrillic as a first-class script. Tabular numbers (`'tnum' 1`) are on by default — required for task IDs, due-in counters, and date columns.
**Identifier Font:** Geist Mono (with `ui-monospace` fallback). Used for Jira IDs, branch names, Git SHAs, IP addresses — anything that is not natural language renders in mono so identifier reads visibly distinct from prose.

**Character:** engineered, neutral, faintly humanist on Onest body — the mix reads as a developer-tool that has been sanded smooth, not as a designer's flourish. No display-serif anywhere; no script weights; no italics outside semantic emphasis.

### Hierarchy

- **Display** (Geologica, weight 500, `3.2rem` / 51 px, line-height 1.1, `wdth 78`): rare — auth surfaces, empty-state titles.
- **Headline** (Geologica, weight 600, `1.75rem` / 28 px, line-height 1.2): route headings (Plan, Tasks, Team).
- **Title** (Geologica, weight 500, `1.125rem` / 18 px, line-height 1.3): feature titles in drawer, Gantt row titles.
- **Body** (Onest, weight 400, `0.875rem` / 14 px, line-height 1.5, `'ss01' 'tnum'`): primary body, form inputs, table cell content. Caps prose at 70ch in drawers and callouts.
- **Label** (Onest, weight 500, `0.75rem` / 12 px, letter-spacing `0.02em`): meta strings, due-in counters, status chips, table column headers.
- **Mono** (Geist Mono, weight 400, `0.8125rem` / 13 px, `'tnum' 1`): identifiers and key caps only.

### Named Rules

**The Mono-as-Type-Boundary Rule.** Anything that is not natural language renders in mono. Jira IDs, branch names, environment identifiers, file paths — they get the mono face so the eye can skip past them without re-parsing.

**The Tabular-Numbers Rule.** Body and mono both run with `'tnum' 1`. Counts, dates, and IDs must align across rows; proportional digits in a Gantt row are a bug.

**The No-400-Adjacency Rule.** Hierarchy through scale + weight contrast (≥1.25 ratio between steps). Avoid placing weight 400 next to another weight 400 step at adjacent sizes — the eye loses the level.

## 4. Elevation

The system is **flat with deliberate seams**. Surfaces stack by tonal layering — `bg` → `surface` → `elevated` — with a 1 px hairline border for separation. Shadows appear only when an element is genuinely lifted off the page (drawer, dialog, popover). Glassmorphism is forbidden on cards; the only allowed use is the app header, where a subtle `backdrop-filter` (≤8 px blur, ≥0.6 opacity) reads as glass without becoming decoration.

### Shadow Vocabulary

- **Shadow Small** (`box-shadow: 0 1px 2px oklch(0 0 0 / 0.30)`): cards at rest, primary buttons. Whisper-thin separation, never decorative.
- **Shadow Large** (`box-shadow: 0 12px 30px oklch(0 0 0 / 0.45)`): drawers and dialogs only. Tells the eye the surface is genuinely floating.
- **Inset Light** (`inset 0 0 0 1px oklch(0 0 0 / 0.25)`): pressed-button feedback, recessed input backgrounds.
- **Inset Medium** (`inset 0 0 0 1px oklch(0 0 0 / 0.30)`): the same effect on darker contexts where the lighter inset gets lost.

### Radii

The system has not yet promoted radii to tokens; values are hardcoded per primitive and intentional. Treat the list below as the legal vocabulary — do not introduce a new step without a real reason.

- **Pill** (`999px`): buttons, role badges, avatar, status chip.
- **Card** (`1rem` / 16 px): `.card` surfaces, drawer panels.
- **Field** (`0.75rem` / 12 px): inputs, selects.
- **Dialog** (`10px`): modal containers (rare).
- **Square** (`6px`): the rare button variant that needs to align flush with a flat row (Gantt toolbar attachment).

### Named Rules

**The Lift-on-State Rule.** Elevation is not a decorative tier — it is a response to state. Drawers, dialogs, and popovers earn `shadow-lg` because they are *on top of* the rest of the app. Static cards get `shadow-sm` only when they need to detach from `bg`; on `surface` they pass without a shadow at all.

**The No-Glass-on-Cards Rule.** `backdrop-filter: blur` on a card surface is forbidden. The only place glass is allowed is the app header chrome, where it reads as a structural film, not as a treatment.

## 5. Components

DS primitives live in `src/common/ds/`. Composed surfaces — anything page-specific — live in `src/pages/<feature>/components/`. Inline-edit primitives in `src/pages/Gantt/components/InlineEditors/` are the *first choice* edit surface; modal forms are last resort.

### Buttons (`src/common/ds/Button`)

- **Shape:** pill (`999px`), with a `square` (`6px`) variant for flush-aligned toolbar attachments.
- **Sizes:** `sm` (32 px min-height, padding `0.35rem 0.75rem`), `md` (44 px, padding `0.5rem 1.1rem` — the default), `lg` (52 px, padding `0.85rem 1.6rem`).
- **Primary:** solid amber (`accent`), amber-ink text, no gradient. Hover lifts to `accent-hover` (no scale).
- **Secondary:** `surface` fill, `border-strong` outline on hover, `text` color.
- **Ghost:** transparent until hover, used in toolbars and inline actions; ghost hover surface is `accent-dim`.
- **Danger:** `text` swapped to `danger`, border tinted `color-mix(in oklch, var(--danger) 40%, transparent)`. Loading state replaces the label with a 14 px spinner; the button stays the same width to prevent layout jump. `aria-pressed` is required on every toggle.

### Field / TextField (`src/common/ds/Field`)

Label above input, hint below. Input rests on `surface` with `0.75rem` radius, focused border lifts to `accent`. Inline-edit primitives (`InlineTextCell`, `InlineDateCell`) inherit the same look but drop the label — the label is the row context.

### Callout (`src/common/ds/Callout`)

`tone` ∈ `info | success | warning | danger`. `layout="banner"` for full-width inline messages; `layout="card"` for an empty-state shell. Never uses a side-stripe border (left/right colored bar) — full border or background tint only. The tinted background uses `color-mix(in oklch, var(--<tone>) 12%, var(--surface))` so the surface stays warm even when the tone is cold.

### Badge (`src/common/ds/Badge`)

Pill-shape `999px`, `2px 8px` padding, `label` typography. Variants are state-keyed: a Badge with a state hue is the textual mirror of a `StatusDot`. Never carries an icon — that's the `IntegrationIcon`'s job.

### StatusDot (`src/common/ds/StatusDot`)

6 px circle, always paired with a 16 px integration logo (Confluence, GitLab, Jira, Slack) so color is reinforcement, not the only signal. Three roles: blocked (amber), clear (green), failed (danger).

### Spinner (`src/common/components/Spinner`) and Kbd (`src/common/ds/Kbd`)

- **Spinner:** pure-CSS rotating ring, sizes 14 / 20 / 28 px; takes `label?` for screen readers.
- **Kbd:** small monospaced key cap (`Geist Mono`, weight 500) with a faint inset shadow (`inset-light`). Used in shortcut hints and the legend.

### Dialog (`src/common/ds/Dialog`)

`elevated` surface, `10px` radius, `shadow-lg`. Used only for genuinely modal flows (destructive confirms). **Never the first answer to a "create something" task.** The recent removal of `CreateFeatureDialog` in favor of `AddFeatureRow` is the canonical example: an inline ghost-button that expands into a single-input row, with focus retention after submit so a manager can rapid-add three features without ever seeing a modal.

### Plan-view composites (`src/pages/Gantt/components/`)

- **GanttToolbar** — eyebrow title + scope/state/zoom controls, all keyboard-shortcuted.
- **GanttFeatureRow** — sticky 280 px gutter (lead avatar, title, mini-team avatars, due chip) + scrolling segmented bar.
- **GanttSegmentedBar** — five contiguous stage segments using the state palette, plus an overlay status icon (current / overdue / completed / upcoming / not-planned).
- **GanttStageSubRow** — expanded per-stage row revealed on toggle; carries inline date and owner editors.
- **AddFeatureRow** — the inline create affordance. Two variants: `row` (head of `gantt-page__lanes`) and `standalone` (empty state).
- **StagePlanTable / StagePlanRow / StagePerformerCombobox** — the per-stage planning grid in the drawer's edit view.
- **GanttGoToDate** — `Cmd/Ctrl+G` jump-to-date overlay.

### Named Rules

**The Inline-First Rule.** A "create" or "edit" task gets an inline affordance before it gets a dialog. Dialogs are only for destructive confirms, multi-field forms that will not fit a row, or genuinely modal handshakes. New `*Dialog` components require justification.

**The Sticky-Gutter Rule.** Identity stays visible while time scrolls. The Gantt's 280 px sticky gutter is load-bearing, not decoration — anything that breaks `position: sticky` on it breaks the surface.

**The 280 ms Cap.** Pulse and highlight effects (e.g. `AddFeatureRow` post-create flash) animate only `background-color` and `opacity`, capped at 280 ms. All motion collapses to instant under `prefers-reduced-motion: reduce`.

## 6. Do's and Don'ts

### Do

- **Tint every neutral.** Hue 60 (warm graphite) on any value below 0.50 lightness; chroma stays ≤0.012 so the tint reads as temperature.
- **Keep color in two layers.** Neutrals + one accent on the chrome; the state palette inside the pipeline visual system. Anything else is decoration.
- **Vary spacing for rhythm.** Same padding everywhere is monotony. Mix `8 / 12 / 16 / 24` deliberately.
- **Use the mono face for identifiers.** Jira IDs, branch names, SHAs, environment names — not body text.
- **Prefer inline editing over modals.** Make the row the form. The dialog is the last resort.
- **Test both languages.** Russian is primary, English is the mirror. Geologica's condensed `wdth 78` axis is what keeps the gutter readable in Russian — never replace it without checking Cyrillic widths.
- **Honour `prefers-reduced-motion`.** Every transition collapses to instant. The codebase already does this; new motion must too.
- **Animate `transform` and `opacity` only.** `width`, `height`, `top`, `left` are layout properties — animating them stutters.
- **Size focus rings to the affordance.** Buttons get a 2 px `accent` ring at 2 px offset; inline cells get a 1 px ring with no offset.

### Don't

- **No `#000` or `#fff`.** Untinted neutrals look industrial in the wrong way.
- **No cyan-on-dark.** The AI-tooling cliché is the system's explicit anti-direction.
- **No Jira blue, Trello pastel, MS Project gridline gloom.** All three are anti-references.
- **No gradient text** (`background-clip: text` + linear-gradient) — emphasis is weight or size.
- **No side-stripe borders** (`border-left: 4px solid var(--accent)`) on cards, callouts, list items. Full border or background tint only.
- **No glassmorphism on cards.** Allowed only on the app header chrome at ≤8 px blur.
- **No hero-metric template.** Big-number-+-tiny-label-+-delta-arrow is SaaS dashboard cliché; this surface is denser than that.
- **No identical card grids.** Same-sized cards with icon + heading + text repeated endlessly is the AI slop tell.
- **No modal as the first answer to "create something".** `CreateFeatureDialog` was removed for a reason.
- **No nested cards.** Always wrong. Promote the inner card to a row, or remove the outer one.
- **No em dashes in narrative copy.** Use commas, colons, semicolons, periods, or parentheses. Carve-outs: numeric date/time ranges (`14 May — 30 May`) and Russian predicate-binding idioms (`Enter — добавить`, `Ctrl+G — перейти`) where the em-dash is the native typographic mark.
- **No restated headings.** Subtitles that paraphrase the title are noise.
