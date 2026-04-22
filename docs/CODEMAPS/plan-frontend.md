# Plan frontend (`src/features/gantt/*`) — CODEMAP

The `/plan` route in the React 19 SPA: a Gantt-style timeline of features, their mini-team, and a drawer for per-feature editing. Talks only to the REST gateway's `/api/plan/*` endpoints; never to Features or Tasks directly.

## Route

- `OneMoreTaskTracker.WebClient/src/app/App/App.tsx` — registers the `/plan` route behind `ProtectedRoute`.
- `OneMoreTaskTracker.WebClient/src/app/HomeRoute.tsx` — role-aware root redirect; managers land on `/plan`, other roles on their default page.

## Page

| File | Responsibility |
|---|---|
| `OneMoreTaskTracker.WebClient/src/features/gantt/GanttPage.tsx` | Top-level page. Splits into a data-wiring wrapper and a presentational `GanttPageInternal` so Storybook can drive the UI without network. |
| `OneMoreTaskTracker.WebClient/src/features/gantt/GanttPage.css` | Page-level layout (grid, unscheduled section, empty state). |
| `OneMoreTaskTracker.WebClient/src/features/gantt/useGanttPageState.ts` | UI state hook: zoom level, drawer-open feature id, create-dialog toggle. |
| `OneMoreTaskTracker.WebClient/src/features/gantt/usePlanFeatures.ts` | Fetches `/api/plan/features`, handles loading/error, exposes retry. |
| `OneMoreTaskTracker.WebClient/src/features/gantt/useTeamRoster.ts` | Fetches the manager's team roster for populating the mini-team column. |

## Primitives

| Component | File | Role |
|---|---|---|
| `GanttTimeline` | `OneMoreTaskTracker.WebClient/src/features/gantt/GanttTimeline.tsx` | Horizontal date axis, today-line, zoom rendering. |
| `GanttFeatureRow` | `OneMoreTaskTracker.WebClient/src/features/gantt/GanttFeatureRow.tsx` | One feature as a bar positioned via `useGanttLayout`. |
| `GanttAssigneeStack` | `OneMoreTaskTracker.WebClient/src/features/gantt/GanttAssigneeStack.tsx` | Avatars of the lead + mini-team for a feature. |
| `GanttEmpty` | `OneMoreTaskTracker.WebClient/src/features/gantt/GanttEmpty.tsx` | Empty-state illustration + primary CTA. |
| `GanttToolbar` | `OneMoreTaskTracker.WebClient/src/features/gantt/GanttToolbar.tsx` | Zoom, scope, state filters; create button. |

## Drawer

- `OneMoreTaskTracker.WebClient/src/features/gantt/FeatureDrawer.tsx` — side drawer shell, opens on row click.
- `OneMoreTaskTracker.WebClient/src/features/gantt/FeatureEditForm.tsx` — form body; wires state, dates, lead, description; submits via `planApi.updateFeature`.
- `OneMoreTaskTracker.WebClient/src/features/gantt/useFeatureDrawerData.ts` — fetches detail (`/api/plan/features/{id}`) + roster into a single render-ready shape.
- `OneMoreTaskTracker.WebClient/src/features/gantt/FeatureDrawer.css` — drawer chrome.

## Create flow

- `OneMoreTaskTracker.WebClient/src/features/gantt/CreateFeatureDialog.tsx` — modal form wired to `planApi.createFeature`. Refreshes the list via `usePlanFeatures`' retry/mutation hook.

## Shared math

- `OneMoreTaskTracker.WebClient/src/features/gantt/ganttMath.ts` — pure date → pixel math: `ZOOM_DAYS`, day/week/month scales, clamp helpers. Unit-tested via `ganttMath.test.ts`.
- `OneMoreTaskTracker.WebClient/src/features/gantt/useGanttLayout.ts` — memoised lane assignment and bar geometry from the feature list + zoom level.

## API client

- `OneMoreTaskTracker.WebClient/src/shared/api/planApi.ts` — typed fetch wrapper for `/api/plan/*` on the gateway (`listFeatures`, `getFeature`, `createFeature`, `updateFeature`, `attachTask`, `detachTask`). All responses pass through Zod schemas before reaching components.

## Types

- `OneMoreTaskTracker.WebClient/src/shared/types/feature.ts` — `FeatureSummary`, `FeatureDetail`, `MiniTeamMember`, `FeatureState` literal union. These mirror the `PlanController` response records 1:1.

## i18n

- `OneMoreTaskTracker.WebClient/src/i18n/locales/en/gantt.json`
- `OneMoreTaskTracker.WebClient/src/i18n/locales/ru/gantt.json`
- The top-level header link uses the key `header.nav.plan` (not the `gantt` namespace) so it renders in the shared navigation.

## Fixtures for Storybook

- `OneMoreTaskTracker.WebClient/src/features/gantt/__fixtures__/FeatureFixtures.ts` — canonical feature / roster fixtures. Exports `FIXTURE_TODAY` (an ISO date string) so timeline stories render deterministically regardless of the wall clock.
- `OneMoreTaskTracker.WebClient/src/features/gantt/__fixtures__/FeatureFixtures.mdx` — story doc that catalogues them.
