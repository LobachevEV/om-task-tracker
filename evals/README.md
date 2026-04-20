# Evals

Deterministic scenario checks that validate end-to-end behavior of the microservice composition (beyond unit/integration tests).

## Scope

Each eval is a scripted scenario exercising the gateway (`OneMoreTaskTracker.Api`) as the entry point and asserting on composed responses that blend `Users`, `Tasks`, and `GitLab.Proxy` data.

## Structure

```
evals/
├── README.md                       (this file)
├── gateway/                        scenarios rooted at the REST gateway
│   ├── 01-register-and-login.md
│   ├── 02-task-state-machine.md
│   ├── 03-assignee-task-summary.md
│   └── 04-mr-discovery.md
├── contracts/                      contract-conformance checks
│   └── 01-proto-field-numbers.md
└── harness/
    └── run-evals.md                how to execute locally and in CI
```

## Scenario Template

Each scenario file declares:

- **Given** — fixture state (seeded users, tasks, MR stubs from `GitLab.Proxy`)
- **When** — an HTTP request to the gateway
- **Then** — the expected HTTP status + response shape, and which services were called in what order
- **Rationale** — why this scenario matters (covers a bug class, enforces an invariant, exercises a gateway composition path)

## Run Locally

```bash
dotnet test tests/OneMoreTaskTracker.Api.Tests --filter Category=Eval
```

## Run in CI

The `backend` job in `.github/workflows/ci.yml` runs all tests including evals.

## Status

Scaffolded 2026-04-20. Scenarios are being ported from the existing xUnit integration tests; add new evals as part of any gateway-composition or state-machine change.

## Adding a New Eval

1. Identify the invariant or bug class the scenario enforces
2. Write a Markdown spec under the appropriate subdirectory using the template above
3. Add the corresponding xUnit test tagged `[Trait("Category", "Eval")]`
4. Update this README if a new subdirectory is introduced
