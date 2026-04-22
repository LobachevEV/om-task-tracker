# Spec 08 — Gantt Storybook foundations — feedback-001

Eval mode: code-only.
Scope: `stateConfig.ts`, `__fixtures__/FeatureFixtures.ts`, `__fixtures__/FeatureFixtures.mdx`, `.storybook/preview.ts`.

---

## Rubric scores

### Design — 9.5 / 10 (weight 0.15)

- `FEATURE_STATE_ENTRIES` exports all 5 entries in the required order (`CsApproving`, `Development`, `Testing`, `EthalonTesting`, `LiveRelease`) with `i18nKey: \`state.${FeatureState}\`` and a `cssVar` field. ✓
- CSS var → feature-state mapping matches spec §§53–59 exactly:
  `CsApproving→--state-not-started`, `Development→--state-in-dev`, `Testing→--state-in-test`, `EthalonTesting→--state-mr-master`, `LiveRelease→--state-completed`. ✓
- `FEATURE_STATE_CSS` is `Readonly<Record<FeatureState, string>>` built via `Object.fromEntries` over the entries. ✓
- `FIXTURE_TODAY = '2026-04-21'`. ✓
- All five `FeatureSummary` fixtures match the spec’s numeric IDs, states, date ranges and `taskCount`/`taskIds` lengths:
  - `SOLO_FEATURE` 101 / `Development` / 04-15..04-28 / 2 tasks ✓
  - `MINI_TEAM_FEATURE` 102 / `Testing` / 04-10..05-05 / 5 tasks ✓
  - `UNSCHEDULED_FEATURE` 103 / `CsApproving` / null…null / 0 tasks ✓
  - `OVERDUE_FEATURE` 104 / `Development` / 03-01..04-10 / 3 tasks ✓
  - `SHIPPED_FEATURE` 105 / `LiveRelease` / 04-02..04-18 / 4 tasks ✓
- `ALL_FEATURES` order is `OVERDUE, SHIPPED, SOLO, MINI_TEAM, UNSCHEDULED`. ✓
- `MINI_TEAM_FEATURE_DETAIL` wraps `MINI_TEAM_FEATURE` with 5 `AttachedTask` rows `REAL-101..REAL-105`, distributed `be/be/qa/fe/fe`; `lead = be`, `miniTeam = [be, fe, qa]`. ✓
- `MINI_TEAM_MEMBERS` exports `{ qa, fe, be, mg }` (all four keys). ✓

Minor nit (−0.5): the `FeatureStateEntry.cssVar` field is typed as `string` rather than the spec’s template-literal type `\`var(--state-${string})\``. The relaxation was required to reuse the team-mirror convention of raw token names, so it’s a defensible trade-off; noting it for completeness.

### Originality — 10 / 10 (weight 0.15)

- `cssVar` values are raw token names (`'--state-not-started'`, etc.), matching `features/team/stateConfig.ts` convention. No `var(--…)` wrapping anywhere in `stateConfig.ts`. ✓ (Note: the spec’s code sample shows wrapped values, but the rubric explicitly mandates raw names and parity with `team/stateConfig.ts`; the implementation correctly follows the rubric and team parity.)
- No new CSS custom properties are introduced. All state colors reuse the existing `--state-not-started | --state-in-dev | --state-in-test | --state-mr-master | --state-completed` set. ✓
- MDX title is exactly `Plan/Foundations/Fixtures` (`<Meta title="Plan/Foundations/Fixtures" />`). ✓
- No React components are shipped in this spec — fixtures, config, and decorator only. ✓

### Craft — 10 / 10 (weight 0.20)

- Every fixture value is a frozen literal (string dates, literal numbers, `null` for unscheduled). `Grep "new Date|Date\.now"` under `src/features/gantt/` returns only the MDX prose warning the reader *not* to use `new Date()` — zero code-level occurrences. ✓
- `preview.ts` wraps every story in the real configured instance from `../src/i18n/config` via `I18nextProvider` (not a stub/mock). ✓
- Locale toolbar offers `ru` (with `defaultValue: 'ru'`) and `en` under the `locale` `globalType`. ✓
- `document.documentElement.dataset.theme = 'dark'` is set in a `useEffect` inside `withI18n`, ensuring dark-theme tokens resolve before stories render. ✓
- MDX cleanly renders a fixture summary table plus the `MINI_TEAM_FEATURE_DETAIL` task table and documents the `FIXTURE_TODAY` rule.

### Functionality — 10 / 10 (weight 0.50)

- F1. `npm run build` → green (tsc + vite, 231 modules, 397 kB JS / 34 kB CSS). ✓
- F2. `npx tsc -b --noEmit` → green, exit 0, no output. ✓
- F3. `npm test -- --run` → **27 files, 215 tests passed**. ✓
- F4. `npm run build-storybook` → green; emits `storybook-static/assets/FeatureFixtures-DEZNPw-E.js`, confirming the MDX page compiled. ✓
- F5. `FEATURE_STATE_ENTRIES` and `FEATURE_STATE_CSS` both exported from `stateConfig.ts` (2 distinct export statements). ✓
- F6. `FeatureFixtures.ts` exports 8 distinct symbols referenced by the rubric
  (`FIXTURE_TODAY`, `SOLO_FEATURE`, `MINI_TEAM_FEATURE`, `UNSCHEDULED_FEATURE`, `OVERDUE_FEATURE`, `SHIPPED_FEATURE`, `ALL_FEATURES`, `MINI_TEAM_FEATURE_DETAIL`) — plus bonus `MINI_TEAM_MEMBERS`. ✓
- F7. `globalTypes` appears exactly once in `preview.ts`. ✓
- F8. `I18nextProvider` (import + wrapping call) and `i18n.changeLanguage(locale)` both present in `preview.ts`. ✓

No caps triggered (no `new Date()` in fixtures, CSS mapping correct, locale toolbar present, F1+F4 both green).

---

## Weighted total

`0.15 × 9.5 + 0.15 × 10 + 0.20 × 10 + 0.50 × 10 = 1.425 + 1.5 + 2.0 + 5.0 = 9.925`

**Score: 9.93 / 10 — PASS** (threshold 7.0).

---

## Top issues / notes

1. **Spec vs. rubric divergence on `cssVar` shape.** The spec’s code block in §§30–45 shows `cssVar: 'var(--state-not-started)'` and types it as `\`var(--state-${string})\``, but the rubric (and team parity) require raw `--state-*` token names. The implementation correctly follows the rubric. Consider amending the spec in a follow-up to remove the ambiguity.
2. **`FeatureStateEntry.cssVar` weakened to `string`.** Consumers lose the template-literal narrowing. A tighter type (e.g. `\`--state-${string}\``) would restore some of that compile-time protection without breaking team parity.
3. **No test exists for `FEATURE_STATE_CSS` equivalence.** A tiny vitest ensuring `FEATURE_STATE_CSS[entry.state] === entry.cssVar` for every entry would lock the mapping against future drift; non-blocking.
4. **Storybook build emits a 500 kB+ chunk warning.** Pre-existing Storybook baseline, not introduced by this spec; noted so downstream specs don’t attribute it to their changes.
