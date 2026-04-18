# OneMoreTaskTracker

A distributed system for managing GitLab merge requests and tasks via a microservice architecture.

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

Rules:
1. Before answering "how does X work" or "where is Y" — read `graphify-out/wiki/index.md` first, then the relevant community article(s).
2. When tracing a behavior across modules, prefer the wiki's community view over grepping individual files.
3. After modifying code, the background `graphify watch` picks up code changes automatically (AST-only, no LLM cost). After changing docs/images, run `/graphify --update` to refresh semantic edges.

## Planning Workflow

Before implementing any task:

1. **Check the knowledge graph** — `graphify-out/wiki/index.md` for a map of the system; drill into relevant community articles for involved components and their edges
2. **Read `docs/`** — especially `docs/CODEMAPS/` for domain, data model, architecture, and component interactions
3. **Identify components** — services, handlers, entities, proto messages, and tests to touch
4. **Then read code** — only after understanding the design, navigate to source files

`docs/` + `graphify-out/wiki/` together are the source of truth for architecture decisions.

## Code Conventions

- Nullable reference types enabled across all C# projects
- Implicit usings enabled
- Proto files grouped by domain area under `Protos/` in each gRPC service
- Handler pattern: one class per use-case (e.g. `CreateTaskHandler`, `FindMrHandler`, `CreateBranchHandler`)
- `IAsyncEnumerable<T>` + `CancellationToken` for streaming gRPC responses
- Test projects mirror service structure under `tests/`, using xUnit + FluentAssertions + NSubstitute
- Integration tests use `WebApplicationFactory<Program>` with `IClassFixture<ApiWebApplicationFactory>`
- Frontend: functional components, Zod schemas at API boundaries, React Context for auth state, `ErrorBoundary` at app root
