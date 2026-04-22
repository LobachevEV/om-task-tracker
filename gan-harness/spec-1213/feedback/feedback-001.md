# Feedback — spec 12 + 13 combined (code-only, attempt 001)

## Dimension scores

| Dimension           | Weight | Score (0-10) | Weighted |
|---------------------|--------|--------------|----------|
| Design              | 0.15   | 9.0          | 1.35     |
| Originality         | 0.15   | 9.0          | 1.35     |
| Craft               | 0.20   | 8.5          | 1.70     |
| Functionality       | 0.50   | 10.0         | 5.00     |
| **Weighted total**  |        |              | **9.40** |

Threshold 7.0 → **PASS**.

No caps triggered (tsc/build/test/storybook all green; seam present; zoom persisted; role default present; AppHeader rules correct).

---

## Command-output tails

### F1 — `npx tsc -b --noEmit` (tail 20)

```
(empty — clean exit 0)
```

### F2 — `npm run build` (tail 20)

```
> onemoretracker-webclient@0.0.0 build
> tsc -b && vite build

vite v7.3.1 building client environment for production...
transforming...
✓ 272 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.79 kB │ gzip:   0.43 kB
dist/assets/index-Del8dQei.css   52.98 kB │ gzip:  10.48 kB
dist/assets/index-DuzPWgcr.js   431.51 kB │ gzip: 133.09 kB
✓ built in 713ms
```

### F3 — `npm test -- --run` (tail 30)

```
 Test Files  34 passed (34)
      Tests  281 passed (281)
   Start at  16:39:29
   Duration  2.41s
```

### F4 — `npm run build-storybook` (tail 40)

```
◇  Output directory:
│  /Users/…/OneMoreTaskTracker.WebClient/storybook-static
└  Storybook build completed successfully
```

(chunk-size warnings present; non-blocking)

---

## Rubric F-gates

| ID  | Check | Result | Evidence |
|-----|-------|--------|----------|
| F1  | `tsc -b --noEmit` green | PASS | exit 0, empty stderr |
| F2  | `npm run build` green | PASS | "✓ built in 713ms" |
| F3  | `npm test --run` green, ≥ 270 | PASS | 281 / 281 passed, 34 files |
| F4  | `npm run build-storybook` green | PASS | "Storybook build completed successfully" |
| F5  | ≥ 8 `*.stories.tsx` in gantt/ | PASS | `ls \| wc -l` → 8 |
| F6  | `<HomeRoute` (×1), `path="/plan"` (×1), `path="/tasks"` (≥1, distinct from `/tasks/:jiraId`) | PASS | App.tsx:27, :48, :32 (separate `/tasks/:jiraId` at :40) |
| F7  | `HomeRoute.test.tsx` covers Manager→/plan and non-Manager→/tasks | PASS | 5 tests (Manager, FE, BE, Qa, unauthenticated) |
| F8  | `AppHeader.test.tsx`: Manager=Plan+Team−Tasks, Dev=Plan+Tasks | PASS | explicit assertions at :38-43, :62-71, :84-88 |
| F9  | Zero `new Date(` / `Date.now(` in `*.stories.tsx` | PASS | grep returned 0 matches |
| F10 | `localStorage` + try/catch in `useGanttPageState.ts` mirroring `src/i18n/config.ts` | PASS | `readPersistedZoom` / `persistZoom` both try/catch (L14-39) |
| F11 | `GanttPageInternal` exported and imported by tests+stories (not wrapper) | PASS | GanttPage.tsx:87 exports; stories L4 + test L5 import internal |

---

## Rubric — Design / Originality / Craft spot-checks

- **Role default scope:** `role === 'Manager' ? 'all' : 'mine'` at `useGanttPageState.ts:62-64`; hook test `defaults scope to "mine" for developers and QA` covers FE/BE/Qa. ✔
- **Zoom persistence:** `localStorage[ZOOM_STORAGE_KEY]` with `ZOOM_STORAGE_KEY = 'mrhelper_gantt_zoom'` (L7); scope + stateFilter are `useState` only (no persistence branch). ✔
- **Test seam:** `GanttPageInternal` is the pure component; thin `GanttPage()` owns `useAuth` + `usePlanFeatures` + `useTeamRoster`. Tests and stories exercise `GanttPageInternal` with synthetic `state` — no `fetch`/`planApi` mocks in test. ✔
- **AppHeader nav rules:** Plan always rendered; Tasks gated on `!isManager`; Team unchanged. Order Plan → Tasks → Team matches spec. ✔
- **HomeRoute:** uses `<Navigate replace>` in both branches; also handles unauthenticated with `/login` fallback (defensive, beyond spec). ✔
- **i18n:** every user-visible string in new components is `t('gantt:…')` / `t('header:…')`. grep for Cyrillic/English uppercase string literals in `GanttPage.tsx` returned 0. ✔
- **Dialog a11y:** `shared/ds/Dialog/Dialog.tsx` applies `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`. `CreateFeatureDialog` passes `title={t('create.title')}` → labelled heading present. ✔
- **GanttToolbar a11y:** zoom buttons carry `aria-pressed={active}`; scope buttons likewise; toolbar has `role="toolbar"` + `aria-label`. ✔
- **GanttEmpty:** `role="status"` + `aria-live="polite"`, `h3` heading, body paragraph, optional CTA gated on `canCreate && onCreate`. ✔
- **Hex colors:** single `#f1a400` as fallback inside `color-mix(var(--warning, #f1a400))` — acceptable (fallback, not primary color source). ✔
- **Dependencies:** `package.json` / `package-lock.json` unchanged (`git diff --stat` empty). ✔
- **Memoisation:** `useGanttLayout` input `features` is the array passed in (stable per render), `rosterById` memoised, `resolveMember`/`miniTeamFor` `useCallback`. ✔

---

## Top 5 issues (non-blocking)

1. **`GanttPage.stories.tsx` mutates the hook's `today` via `(state as unknown as { today: string }).today = FIXTURE_TODAY`.** `today` is derived from a `useRef` inside the hook; this write does nothing at runtime (the hook reads `todayRef.current`, not the returned object's property each render — though the object is re-built with `useMemo`, the ref itself is unchanged). Stories appear correct only because `FIXTURE_TODAY` happens to fall within the auto-windowed range; if the system clock drifts far from the fixture, the Populated story could misalign. Preferred fix: pass `today` as an override prop into `GanttPageInternal`, or use `vi.useFakeTimers` equivalent via a Storybook decorator. Severity: low.
2. **`CreateFeatureDialog` uses a bespoke form rather than `FeatureEditForm`** (spec 12 §93). The generator acknowledged this; noting for the record. Form logic (validation, submit, error surface) duplicates `FeatureEditForm`; divergence risk later.
3. **`GanttToolbar` state filter is a raw `<select>` rather than a DS `Select`** (spec 12 §77). Works, accessible, but deviates from "DS is the source of truth". If DS lacks a `Select`, note the gap in `shared/ds` backlog.
4. **`rosterError` warning banner uses `t('failed')`** (`common:failed`) concatenated with `t('row.team')`; spec 12 acceptance asks for `t('common:error.loadFailed')` (or current equivalent). Works, but the key chosen is slightly off-spec.
5. **`UnscheduledSection` title uses `<h3>` inside `<main>` without an intervening `<h2>`** — the toolbar promotes its label to `<h2>` so heading order is OK, but `GanttEmpty` also uses `<h3>` as the top heading in its subtree; consider promoting `GanttEmpty` to `<h2>` when shown as the sole content of `<main>`. Minor a11y polish.

---

## Acknowledged deferrals (not penalized per rubric)

- Lazy task sub-bar per-row fetch deferred; hover wired, sub-bars stubbed (skeleton).
- Mini-team resolution shows lead only until `FeatureDetail` loads (documented in `GanttPageInternal.miniTeamFor`).
- DS `Dialog` has no focus trap — platform limitation.
- `CreateFeatureDialog` uses bespoke form (issue #2 above is the same deferral).

---

## Final verdict

**PASS** — weighted total 9.40 / 10, well above the 7.0 threshold. All functionality gates green (281 tests, full tsc, build, storybook), both seams present and exercised (`GanttPageInternal` in tests + stories), role-aware home redirect and AppHeader nav rules correct and covered by dedicated tests. Top issues are polish-level and none are caps-triggering.
