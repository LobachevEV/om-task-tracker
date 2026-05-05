# Generator notes — iter 001

## Slice

Planned commits §1: introduce the `IRequestClock` abstraction in both bounded
contexts (Features + Api), wire DI in each `Program.cs`, add unit-test coverage.
No call-site migrations in this iteration — baseline build/tests stay green.

## MUST-improve axes touched

| Axis | Baseline | After iter 1 | Notes |
|------|----------|--------------|-------|
| In-scope production `DateTime.UtcNow` reads | 10 | 10 | unchanged by design — call-site migration starts iter 2 |
| Handlers/controllers depending on `IRequestClock` | 0 | 0 | unchanged by design |
| Entity default-init clock reads | 2 | 2 | unchanged by design |
| Per-request capture integration test | 0 | 0 | landing in iter 5 |
| Unit tests for `RequestClock` | 0 | 4 (2 per service) | target ≥ 3 met |
| `dotnet build` errors | 0 | 0 | green |
| `dotnet test` total / pass | 466 / 466 | 470 / 470 | strict-superset additive drift |

## Files touched

New (6): per-bounded-context interface + impl pair (`Features/Features/Data` and
`Api/Time`), plus one test file per service under matching test-project paths.
Modified (4): both `Program.cs` (DI registration only — JWT block untouched in
Api), both test `.csproj` (added `Microsoft.Extensions.TimeProvider.Testing
10.5.0`).

## Deviations from plan

None. Implementation matches §"Planned commits" item 1 verbatim. The post-edit
linter rewrote `RequestClock` to use a primary constructor; I aligned the Api
copy to the same form for parity. Functional behaviour is identical.

## Verification

- `dotnet build OneMoreTaskTracker.slnx -c Debug --nologo` → 0 errors.
- `dotnet test OneMoreTaskTracker.slnx --nologo` → 470 passed / 0 failed.
- `check-must-not-touch.mjs` → `MUST_NOT_TOUCH_VIOLATION: false`.
- Manual diff vs baseline confirms no MUST-NOT-touch path appears in the change
  set (JwtTokenService, openapi.json, proto, Migrations, sibling services,
  WebClient, compose.yaml, Dockerfiles, appsettings — all clean).
