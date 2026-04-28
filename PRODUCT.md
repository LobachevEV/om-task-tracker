# Product

## Register

product

## Users

**Primary (workspace, all-day):** Project Managers, Team Leads, and QA Leads running release pipelines for teams of 15–100+ people. They plan resources, monitor blockers, and answer cross-cutting questions across 500+ active tasks. This is their command center; they live in it.

**Occasional:** Developers (Frontend / Backend / QA roles in the system). They open the tool once per sprint or release cycle to check the global plan or jump into a Slack channel. Their real workspace is the IDE, Git, and Jira — this tool must respect that and get out of the way fast.

**Job to be done:** answer "what is blocked, why, and whose court is the ball in?" without drilling into individual task cards. The pipeline is the artifact, not the form behind it.

**Scale floor:** must remain readable and decisive at 500+ tasks. Information density and performance are non-negotiable.

## Product Purpose

A release-pipeline command center that pulls signals from GitLab, the internal task tracker, and the team roster, and surfaces them as one continuous picture: features moving across five lifecycle stages (CsApproving → Development → Testing → EthalonTesting → LiveRelease), tasks moving across six pipeline states (NOT_STARTED → IN_DEV → MR_TO_RELEASE → IN_TEST → MR_TO_MASTER → COMPLETED), and the people on the hook for each.

Success is when a manager can scan the Plan view and immediately see what's late, what's blocked, and who owns the next move, without opening a single feature drawer.

## Brand Personality

**Three words:** Structured. Automated. Transparent.

The tool feels like a precision instrument: a well-calibrated industrial engine that pulls data from everywhere and surfaces it without noise or ceremony. It has opinions. It does not apologize.

**Emotional register:** the calm confidence of a control room. Not sterile (it has character), but never loud. The system handles extraordinary complexity quietly.

**Voice:** terse, factual, no marketing prose. Status messages report state ("Saved", "Couldn't add. Try again."), not feelings ("Great job!"). Russian copy is primary; English mirrors it 1:1.

## Anti-references

- **Jira-classic.** Overwhelming menu sprawl, modal-as-first-thought, decorative panels around every list.
- **Trello / Asana-warm.** Informal palette, rounded everything, friendly illustrations, confetti on completion.
- **MS Project / Microsoft Project Online.** Bloated legacy, accidental complexity, dialog stacks, ribbon UI.
- **Generic SaaS dashboards.** Hero-metric template (big number + tiny label + gradient accent + supporting stats grid), feature cards in a 3×3 grid, pastel-on-white safe color schemes.
- **Cyan-on-dark "AI design" cliché.** Cyan-to-green gradient buttons, gradient text, glassmorphism backdrops on every surface, neon-on-black tech-bro aesthetic. Replace entirely.

## Design Principles

1. **Status at a glance.** Integration blockers (Confluence approval pending, GitLab MR open, Jira ticket stalled, Slack thread cold) are visible inline on the row, encoded as micro-indicators (logo + colored dot). No drilling in just to see whose court the ball is in.

2. **Data density over decoration.** Every visual element encodes information. Spacing conveys hierarchy, color encodes state, size conveys importance. Nothing decorates for its own sake. Cards are not the default container; most things don't need one.

3. **Calm precision.** The system handles complexity quietly. Nothing alarms, animates unnecessarily, or uses motion to fill silence. When something moves, it means something changed.

4. **Keyboard-first fluency.** PMs who live here all day navigate, filter, and act without reaching for the mouse. Tab stops, keyboard shortcuts (Z = zoom, S = state filter, Ctrl/Cmd+G = jump to date, Esc = back out, Enter = commit), and a command palette are first-class.

5. **Scalable clarity.** Hierarchy is structural, not decorative. The interface stays readable and decisive at 500+ tasks. If a pattern breaks down at scale, redesign it; do not paper over with collapse-by-default fences.

## Accessibility & Inclusion

- **Floor:** WCAG 2.2 AA across the product surface. AAA on critical-path text where feasible.
- **Color is never the only signal.** State palettes pair color with shape, label, or position (the Gantt segmented bar uses both hue *and* pattern; status dots ride next to a logo). Designs must survive deuteranopia and protanopia simulations.
- **Motion respects `prefers-reduced-motion`.** All transition tokens collapse to instant when the OS preference is set. Pulse / fade-in / slide-in animations are decorative and gated on the same query.
- **Screen reader correctness.** `aria-pressed` on toggle buttons, `aria-live="polite"` on status messages, `aria-live="assertive"` only on hard errors. The Plan view announces inline-edit outcomes via `inlineEdit.announce.*` strings (already wired in i18n).
- **Keyboard reachability.** Every interactive element is reachable by Tab in document order. No keyboard traps. Focus rings are visible against the dark surface (≥3:1 contrast) and against amber when an element has both `:focus` and `aria-pressed="true"`.
- **Bilingual baseline.** All strings live in `gantt.json` / `tasks.json` / `auth.json` under `en/` and `ru/`. ICU plural forms (`_one` / `_few` / `_many` / `_other`) are required for any countable noun, especially in Russian.
