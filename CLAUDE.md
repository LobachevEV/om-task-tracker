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

- **OneMoreTaskTracker.Api** — REST API gateway. Handles JWT authentication, role-based authorization, and forwards requests to gRPC services. Contains `AuthController`, `TasksController`, and `GrpcExceptionMiddleware` that maps gRPC status codes to HTTP.
- **OneMoreTaskTracker.Users** — gRPC service for user management and authentication (login, register, role lookup). Owns `Users` PostgreSQL database. BCrypt work factor 12.
- **OneMoreTaskTracker.Tasks** — gRPC service managing task lifecycle (`NOT_STARTED → IN_DEV → MR_TO_RELEASE → IN_TEST → MR_TO_MASTER → COMPLETED`), backed by `Tasks` PostgreSQL database. Uses event-based projects provider and MRs provider that call GitLab Proxy.
- **OneMoreTaskTracker.GitLab.Proxy** — gRPC proxy that translates gRPC calls into GitLab REST API requests; streams results back with `IAsyncEnumerable<T>`.
- **OneMoreTaskTracker.WebClient** — React 19 SPA. Auth context with JWT stored client-side, `ProtectedRoute`, error boundary, Zod schema validation on API responses.

Request flow: Browser → `OneMoreTaskTracker.Api` (REST, JWT) → gRPC → (`Users` | `Tasks` → `GitLab.Proxy` → GitLab).

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

## Knowledge Graph (graphify)

An agent-crawlable knowledge graph of this project lives at `./graphify-out/`, produced by the `graphify` tool. **Use it before reading raw files when answering architecture or cross-cutting questions.**

- **`graphify-out/wiki/index.md`** — start here. Index of 75 communities (clusters of related code/docs) with `[[WikiLink]]` navigation to each community article. Each article lists the nodes in that community, god nodes, and cross-community edges with confidence tags (EXTRACTED / INFERRED / AMBIGUOUS).
- **`graphify-out/GRAPH_REPORT.md`** — audit report with god nodes (most-connected symbols, your core abstractions), surprising cross-file connections, and suggested questions the graph is uniquely positioned to answer.
- **`graphify-out/graph.json`** — raw graph (617 nodes, 911 edges). Query via `/graphify query "<question>"`, `/graphify path "A" "B"`, `/graphify explain "<node>"`.
- **`graphify-out/graph.html`** — interactive visual graph.

**Freshness warning — the wiki may be stale.** Only `graph.json` and `GRAPH_REPORT.md` are kept current automatically (by the `post-commit` and `post-checkout` git hooks in `.git/hooks/`, which run `graphify`'s AST-only `_rebuild_code`). The `graphify-out/wiki/` directory and semantic (INFERRED / AMBIGUOUS) edges are only refreshed by the LLM-powered `/graphify --update`, which is run manually. Treat wiki content as a snapshot that may lag current code.

Rules:
1. Before answering "how does X work" or "where is Y" — read `graphify-out/wiki/index.md` first, then the relevant community article(s).
2. When tracing a behavior across modules, prefer the wiki's community view over grepping individual files, but verify load-bearing claims against the current source before acting on them (the wiki can be stale).
3. `graph.json` and `GRAPH_REPORT.md` auto-refresh on every commit and branch switch via git hooks (AST-only, no LLM cost). The wiki and semantic edges do NOT — run `/graphify --update` after docs/image changes or when you notice wiki drift from current code.
4. If a wiki claim contradicts what you see in the source, trust the source and flag the drift to the user.

## Planning Workflow

Before implementing any task:

1. **Check the knowledge graph** — `graphify-out/wiki/index.md` for a map of the system; drill into relevant community articles for involved components and their edges (remember the wiki may be stale — verify before acting)
2. **Identify components** — services, handlers, entities, proto messages, and tests to touch
3. **Then read code** — only after understanding the design, navigate to source files; source is always authoritative over the wiki

## Code Conventions

- Nullable reference types enabled across all C# projects
- Implicit usings enabled
- Proto files grouped by domain area under `Protos/` in each gRPC service
- Handler pattern: one class per use-case (e.g. `CreateTaskHandler`, `FindMrHandler`, `CreateBranchHandler`)
- `IAsyncEnumerable<T>` + `CancellationToken` for streaming gRPC responses
- Test projects mirror service structure under `tests/`, using xUnit + FluentAssertions + NSubstitute
- Integration tests use `WebApplicationFactory<Program>` with `IClassFixture<ApiWebApplicationFactory>`
- Frontend: functional components, Zod schemas at API boundaries, React Context for auth state, `ErrorBoundary` at app root
