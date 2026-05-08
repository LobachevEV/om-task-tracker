@~/.claude/rules/microservices/contracts.md
@~/.claude/rules/microservices/composition.md
@~/.claude/rules/microservices/security.md
@~/.claude/rules/microservices/data.md

# OneMoreTaskTracker

A distributed system for managing GitLab merge requests and tasks.

## Architecture

**Microservices + Domain-Driven Design.** Each service is a bounded context with its own schema, wire contract, and deployment lifecycle. The gateway (`OneMoreTaskTracker.Api`) owns all cross-service composition; sibling services do NOT call each other east-west. The design rules that govern this architecture live in `~/.claude/rules/microservices/*.md` (imported at the top of this file).

**Bounded contexts:**

| Context                           | Responsibility                               | Owns                                                                                                                                     |
|-----------------------------------|----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `OneMoreTaskTracker.Users`        | Identity, auth, team membership              | `users` schema; user records; role taxonomy (`Manager`, `FrontendDeveloper`, `BackendDeveloper`, `Qa`)                                   |
| `OneMoreTaskTracker.Tasks`        | Task lifecycle + assignee aggregates         | `tasks` schema; state machine (`NOT_STARTED → IN_DEV → MR_TO_RELEASE → IN_TEST → MR_TO_MASTER → COMPLETED`); per-assignee task summaries |
| `OneMoreTaskTracker.Features`     | Feature identity + lifecycle + planning dates | `features` schema; feature records; feature-state taxonomy (`CsApproving → Development → Testing → EthalonTesting → LiveRelease`)       |
| `OneMoreTaskTracker.GitLab.Proxy` | Anti-corruption layer around GitLab REST API | outbound GitLab API translation; no persistent state                                                                                     |
| `OneMoreTaskTracker.Api`          | REST gateway / BFF                           | JWT issuance + validation; cross-service composition; upstream-error → HTTP mapping (`GrpcExceptionMiddleware`)                          |
| `OneMoreTaskTracker.WebClient`    | React 19 SPA                                 | client-facing DTOs; no direct knowledge of sibling-service contracts                                                                     |

**DDD conventions applied here:**
- Each bounded context's public contract uses its own domain vocabulary (e.g. Tasks exposes `AssigneeTaskSummary`, not `UserStatus`). Cross-context identities use role-prefixed references (`assignee_user_id`). See `~/.claude/rules/microservices/contracts.md`.
- Handler-per-use-case pattern (`CreateTaskHandler`, `FindMrHandler`, `RegisterHandler` etc.) aligns with Application-layer use cases.
- `Task.UserId` column is an opaque FK to the Users context; no DB-level FK constraint across schemas.
- Role strings (`Manager`, `FrontendDeveloper`, …) are the canonical identifier for the Users context's aggregate; every other context mirrors them verbatim (see the per-service `Roles.cs` / `Roles` mirrors).

## Tech Stack

- **Backend:** C# / .NET 10.0, ASP.NET Core, gRPC (Grpc.AspNetCore), Entity Framework Core, PostgreSQL (Npgsql)
- **Frontend:** React 19, TypeScript, Vite, Vitest
- **IPC:** gRPC with Protocol Buffers (proto3)
- **Auth:** JWT bearer tokens, BCrypt password hashing
- **Mapping:** Mapster
- **Tests:** xUnit, FluentAssertions, NSubstitute, `WebApplicationFactory`

## Project Structure

```
OneMoreTaskTracker.Api/              # REST API gateway — JWT auth, controllers, middleware → gRPC services
OneMoreTaskTracker.Features/         # Feature planning gRPC service + PostgreSQL (features schema, port 5110)
OneMoreTaskTracker.GitLab.Proxy/     # gRPC proxy service → GitLab REST API (port 5176)
OneMoreTaskTracker.Tasks/            # Task management gRPC service + PostgreSQL (port 5102)
OneMoreTaskTracker.Users/            # User management gRPC service + PostgreSQL (auth, roles)
OneMoreTaskTracker.WebClient/        # React 19 + TypeScript frontend (Vite)
tests/                               # xUnit test projects (one per service)
  OneMoreTaskTracker.Api.Tests/
  OneMoreTaskTracker.GitLab.Proxy.Tests/
  OneMoreTaskTracker.Tasks.Tests/
  OneMoreTaskTracker.Users.Tests/
docs/                                # Architecture docs + CODEMAPS
graphify-out/                        # Knowledge graph + wiki (see Knowledge Graph section)
compose.yaml                         # Docker Compose for gitlab-proxy + tasks
```

## Build & Run

```bash
# Restore and build all .NET projects
dotnet restore
dotnet build

# Run individual services
dotnet run --project OneMoreTaskTracker.Api
dotnet run --project OneMoreTaskTracker.Features
dotnet run --project OneMoreTaskTracker.GitLab.Proxy
dotnet run --project OneMoreTaskTracker.Tasks
dotnet run --project OneMoreTaskTracker.Users

# Tests
dotnet test

# Docker Compose (gitlab-proxy + tasks)
docker compose up --build

# Frontend
cd OneMoreTaskTracker.WebClient
npm install
npm run dev
npm test          # vitest
```

## Architecture

- **OneMoreTaskTracker.Api** — REST API gateway. Handles JWT authentication, role-based authorization, and forwards requests to gRPC services. Contains `AuthController`, `TasksController`, `PlanController`, and `GrpcExceptionMiddleware` that maps gRPC status codes to HTTP.
- **OneMoreTaskTracker.Users** — gRPC service for user management and authentication (login, register, role lookup). Owns `Users` PostgreSQL database. BCrypt work factor 12.
- **OneMoreTaskTracker.Tasks** — gRPC service managing task lifecycle (`NOT_STARTED → IN_DEV → MR_TO_RELEASE → IN_TEST → MR_TO_MASTER → COMPLETED`), backed by `Tasks` PostgreSQL database. Uses event-based projects provider and MRs provider that call GitLab Proxy.
- **OneMoreTaskTracker.Features** — gRPC service owning the feature aggregate and its lifecycle (`CsApproving → Development → Testing → EthalonTesting → LiveRelease`). `Task.FeatureId` is an opaque cross-context FK owned by `OneMoreTaskTracker.Tasks`; composition of "a feature plus its tasks plus its mini-team" is done by `OneMoreTaskTracker.Api.Controllers.PlanController`.
- **OneMoreTaskTracker.GitLab.Proxy** — gRPC proxy that translates gRPC calls into GitLab REST API requests; streams results back with `IAsyncEnumerable<T>`.
- **OneMoreTaskTracker.WebClient** — React 19 SPA. Auth context with JWT stored client-side, `ProtectedRoute`, error boundary, Zod schema validation on API responses.

Request flow: Browser → `OneMoreTaskTracker.Api` (REST, JWT) → gRPC → (`Users` | `Tasks` | `Features` → `GitLab.Proxy` → GitLab).

## Key Configuration

- GitLab base URL: `appsettings.json` in `OneMoreTaskTracker.GitLab.Proxy` (override via `GitLab__BaseUrl` env var for Docker)
- PostgreSQL connections: `appsettings.json` in `OneMoreTaskTracker.Tasks` and `OneMoreTaskTracker.Users` (localhost:5432)
- JWT signing key and issuer: `appsettings.json` in `OneMoreTaskTracker.Api` (`JwtOptions`)
- Kestrel configured for HTTP/2 (gRPC) in all three gRPC services

## Docker

`OneMoreTaskTracker.GitLab.Proxy` and `OneMoreTaskTracker.Tasks` have Dockerfiles with multi-stage builds:
- Base image: `mcr.microsoft.com/dotnet/aspnet:10.0`
- Exposed ports: 8080 (HTTP/2), 8081 (HTTPS)
- `compose.yaml` maps host ports 5176 (proxy) and 5102 (tasks)

## Code Conventions

- Nullable reference types enabled across all C# projects
- Implicit usings enabled
- Proto files grouped by domain area under `Protos/` in each gRPC service
- Handler pattern: one class per use-case (e.g. `CreateTaskHandler`, `FindMrHandler`, `CreateBranchHandler`)
- `IAsyncEnumerable<T>` + `CancellationToken` for streaming gRPC responses
- Test projects mirror service structure under `tests/`, using xUnit + FluentAssertions + NSubstitute
- Integration tests use `WebApplicationFactory<Program>` with `IClassFixture<ApiWebApplicationFactory>`
- Frontend: functional components, Zod schemas at API boundaries, React Context for auth state, `ErrorBoundary` at app root

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **om-task-tracker** (6050 symbols, 12556 relationships, 233 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/om-task-tracker/context` | Codebase overview, check index freshness |
| `gitnexus://repo/om-task-tracker/clusters` | All functional areas |
| `gitnexus://repo/om-task-tracker/processes` | All execution flows |
| `gitnexus://repo/om-task-tracker/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
