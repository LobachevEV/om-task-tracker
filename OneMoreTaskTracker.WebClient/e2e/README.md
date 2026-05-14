# E2E Tests (Playwright)

End-to-end test suite for the WebClient. Drives the real UI (via `npm run dev`) against the real gateway + microservices and asserts user-visible behavior.

## Structure

```
e2e/
├── fixtures/
│   ├── devSeed.ts         # Mirror of OneMoreTaskTracker.Users/Data/DevDataSeeder.cs
│   └── devFeatureSeed.ts  # Mirror of OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs
├── helpers/
│   ├── auth.ts            # apiLogin / apiRegister / localStorage helpers
│   └── backend.ts         # isBackendReachable() — lets specs skip cleanly when backend is down
├── pages/                 # Page Object Model
│   ├── AppHeader.ts
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── TasksPage.ts
│   ├── TaskDetailPage.ts
│   └── TeamPage.ts
├── specs/
│   ├── auth.spec.ts           # register → login → logout, negative cases, ProtectedRoute
│   ├── team-roster.spec.ts    # dev-seeded team, search, AppHeader regression (8599d2a)
│   ├── task-lifecycle.spec.ts # task create + state stepper (@integration — needs Tasks svc)
│   └── i18n.spec.ts           # RU/EN switcher, persistence, round-trip
└── tsconfig.json
```

## Running locally

1. Start the gateway (and ideally Tasks + Users + GitLab.Proxy):

   ```bash
   # From repo root — dev-seeds the default team (see ~/.claude memory: dev_seed_fixture)
   dotnet run --project OneMoreTaskTracker.Users
   dotnet run --project OneMoreTaskTracker.Tasks
   dotnet run --project OneMoreTaskTracker.GitLab.Proxy
   dotnet run --project OneMoreTaskTracker.Api
   ```

2. Run the suite:

   ```bash
   cd OneMoreTaskTracker.WebClient
   npm run e2e                 # headless, all browsers
   npm run e2e -- --project=chromium
   npm run e2e:headed          # see browser
   npm run e2e:ui              # interactive UI mode
   npm run e2e:report          # open the HTML report after a run
   ```

   Playwright starts Vite automatically (`webServer` in `playwright.config.ts`). Set `E2E_EXTERNAL_SERVER=1` if you already have `npm run dev` running.

## Behavior when services are down

- **Gateway unreachable (port 5000):** specs that need it call `test.skip(...)` with a clear message. No misleading failures.
- **Tasks service unreachable (gateway returns 502/503):** `@integration task lifecycle` specs skip gracefully.
- **GitLab unreachable:** the NotStarted → InDev transition is already `test.fixme()` — it needs a GitLab stub before it can run in CI. Re-enable once one exists.

## Conventions

- Selectors prefer accessibility-first locators (`getByRole`, `getByLabel`). Where class names are used, pick structural ones (`.app-header`) over themeable ones.
- Every mutation waits on the matching API response (`page.waitForResponse(...)`) rather than arbitrary timeouts.
- Auth flow tests go through the UI; other specs inject a real JWT into `localStorage` via `seedAuthInLocalStorage` to keep tests focused on the feature under test.
- `addInitScript` runs on every navigation including `page.reload()` — do not use it to seed state that the test later expects to change (see the "persists language choice" test for the failure mode).

## Environment variables

| Variable               | Default                     | Purpose                                         |
|------------------------|-----------------------------|-------------------------------------------------|
| `E2E_PORT`             | `5173`                      | Port Playwright starts the Vite dev server on  |
| `E2E_BASE_URL`         | `http://localhost:$E2E_PORT`| Base URL Playwright navigates to                |
| `E2E_API_BASE_URL`     | `http://localhost:5000`     | Gateway base URL for `apiLogin` / `isReachable` |
| `E2E_EXTERNAL_SERVER`  | unset                       | Set to `1` to skip Playwright's Vite autostart  |
| `CI`                   | unset                       | Enables retries (2) and a single worker         |
| `ALUMNIUM_MODEL`       | `ollama/qwen3:14b`          | Alumnium model spec for the AI specs           |
| `OLLAMA_HOST`          | `http://127.0.0.1:11434`    | Ollama base URL for the AI specs               |

## AI-assisted specs (`specs-ai/`)

A second, opt-in suite lives under `e2e/specs-ai/` and is driven by [Alumnium](https://alumnium.ai/) plus a local LLM via Ollama. It is NOT run by `npm run e2e` (the default config has `testIgnore: ['**/specs-ai/**']`).

Setup (one-time):

```bash
ollama pull qwen3:14b          # ~9 GB
```

Run:

```bash
npm run e2e:ai                 # headless, chromium only
npm run e2e:ai:headed          # see browser
```

Specs skip cleanly when either the gateway (`:5000`) or Ollama (`:11434`) is unreachable, or when the configured model tag is not present in `ollama list`. Defaults live in `playwright.ai.config.ts` and can be overridden via `ALUMNIUM_MODEL` / `OLLAMA_HOST`.

Notes:
- Use `127.0.0.1` (not `localhost`) — alumnium's `ALUMNIUM_OLLAMA_URL` validator rejects bare hostnames, so this suite goes through `OLLAMA_HOST` instead, which has no URL regex.
- `oxfmt` is an extra devDependency added solely to work around a packaging gap in `alumnium@0.20.0` (it imports `oxfmt` eagerly without declaring it as a dep).
- A single `al.check(...)` round-trip with qwen3:14b takes ~15–25s and ~10k input tokens. Keep AI assertions coarse and few; the existing Playwright POM specs remain the right tool for fine-grained checks.
- **Attribute filtering:** `plan.ai.spec.ts` passes `EXCLUDE_ATTRIBUTES` (exported from `e2e/helpers/llm.ts`) into the `Alumni` constructor via `excludeAttributes`. Alumnium's Chromium CDP path serialises ARIA semantic properties (not HTML DOM attributes), so the filter targets CDP `AXPropertyName` values: `name` (strips verbose date strings from 90+ calendar gridcells and long stage-editor labels), `focusable`, `focused`, `url`, `invalid`, `readonly`, `required`, `editable`, `settable`, `multiline`, `orientation`, `autocomplete`, `pressed`, and `level`. Structural ARIA properties (`role`, `value`, `checked`, `disabled`, `expanded`) and node text content are kept, so the LLM retains full semantic context about interactive controls. This reduces input tokens per `al.check(...)` from ~10017 (baseline) to ≤ 4000 (target). The filter only affects what Alumnium serialises; the real DOM and the default Playwright POM suite (`specs/`) are unchanged.

## CI

```yaml
# .github/workflows/e2e.yml (sketch)
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: cd OneMoreTaskTracker.WebClient && npm ci
- run: cd OneMoreTaskTracker.WebClient && npx playwright install --with-deps chromium
# bring up the full .NET stack here — compose or dotnet run --project ...
- run: cd OneMoreTaskTracker.WebClient && npm run e2e -- --project=chromium
- if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: OneMoreTaskTracker.WebClient/playwright-report/
```
