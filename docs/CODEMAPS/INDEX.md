<!-- Generated: 2026-04-03 | Files scanned: 70+ | Token estimate: ~450 -->

# OneMoreTaskTracker Codemaps Index

**Last Updated:** 2026-04-03
**Repository:** OneMoreTaskTracker (Distributed GitLab MR Management System)

## Overview

OneMoreTaskTracker is a microservice-based system for orchestrating complex GitLab workflows:
- **DevToRelease (DTR):** Create release branches and MRs from development
- **ReleaseToMaster (RTM):** Create MRs from release to master
- **MergeMrs (MMR):** Merge open MRs

Built with **C# .NET 10.0** (backend), **React 19** (frontend), **gRPC** (inter-service communication), and **JWT** (authentication).

---

## Codemap Files

### 1. [architecture.md](architecture.md)
**High-level system design and component relationships**

- System diagram (CLI → Frontend → APIs → gRPC Services → GitLab)
- Entry points (3 services, 1 CLI, 1 web app)
- Core namespaces overview
- Communication patterns
- Technology stack

**Start here** to understand how systems fit together.

---

### 2. [backend.md](backend.md)
**Backend services, handlers, and domain workflows**

- **OneMoreTaskTracker.GitLab.Proxy** — 6 gRPC handlers translating to GitLab REST API
- **OneMoreTaskTracker.Tasks** — Task lifecycle management, database persistence
- **OneMoreTaskTracker.Domain** — Domain models and workflow handlers (DTR, RTM, MMR)
- Handler classes with proto signatures
- Database context overview
- Provider pattern (IProjectsProvider, IMrsProvider)
- CLI commands and configuration

**Read this** to understand backend logic and handler implementations.

---

### 3. [frontend.md](frontend.md)
**React frontend structure and API integration**

- Feature-based layout: `app/`, `features/auth/`, `features/tasks/`, `shared/`
- Pages: `TaskPage` (list/create), `TaskDetailPage` (MRs, projects, move state)
- Shared components: `AppHeader`, `ConfirmDialog`, `ErrorBoundary`, `Spinner`
- API layer: `httpClient`, `tasksApi`, `authApi`, Zod validation schemas
- Custom hook `useTaskDetail` for task detail + move
- Auth: `AuthContext`, `ProtectedRoute`, localStorage helpers
- Vitest + Testing Library setup
- TypeScript types and Vite build configuration

**Read this** for frontend development and API contract understanding.

---

### 4. [data.md](data.md)
**Database schema, models, and task state lifecycle**

- Task state enum and transitions (6 states: NOT_STARTED → COMPLETED)
- Entity Framework Core DbContext
- Three tables: Tasks, GitRepos, MergeRequests
- Proto message models for gRPC
- Domain model abstractions (MergeRequest, Project)
- State determination logic
- Data flow diagrams

**Read this** to understand data persistence and state management.

---

### 5. [dependencies.md](dependencies.md)
**External services, APIs, and package dependencies**

- GitLab SaaS HTTP API endpoints
- PostgreSQL database (Npgsql driver)
- NuGet packages (ASP.NET Core, EF Core, gRPC, Mapster)
- npm dependencies (React, Vite, TypeScript, ESLint)
- Environment variables and configuration
- Proto service interfaces
- Docker deployment setup

**Read this** for integration points, security config, and deployment.

---

## Quick Navigation

### By Scenario

**I want to...**

| Task                             | Read                                        |
|----------------------------------|---------------------------------------------|
| Understand the overall system    | architecture.md                             |
| Add a new gRPC service           | backend.md + dependencies.md                |
| Add a new handler                | backend.md (handler pattern section)        |
| Modify task state logic          | data.md + backend.md                        |
| Update the frontend UI           | frontend.md                                 |
| Add a new API endpoint           | architecture.md + backend.md (OneMoreTaskTracker.Api) |
| Modify database schema           | data.md + backend.md                        |
| Configure environment variables  | dependencies.md                             |
| Deploy to production             | dependencies.md (docker-compose section)    |
| Understand data flow             | data.md + architecture.md                   |
| Add authentication/authorization | backend.md (OneMoreTaskTracker.Api, OneMoreTaskTracker.Users)   |
| Add a new user role              | backend.md + data.md (Users schema)         |

### By Technology

| Technology              | Codemap                      |
|-------------------------|------------------------------|
| gRPC & Protocol Buffers | backend.md, dependencies.md  |
| Entity Framework Core   | data.md, backend.md          |
| PostgreSQL              | data.md, dependencies.md     |
| React & TypeScript      | frontend.md, dependencies.md |
| ASP.NET Core            | backend.md, dependencies.md  |
| GitLab API              | backend.md, dependencies.md  |

### By Component

| Component             | Codemap                      |
|-----------------------|------------------------------|
| OneMoreTaskTracker.GitLab.Proxy | backend.md, architecture.md  |
| OneMoreTaskTracker.Tasks        | backend.md, data.md          |
| OneMoreTaskTracker.Users        | backend.md, data.md          |
| OneMoreTaskTracker.Api          | backend.md, architecture.md  |
| OneMoreTaskTracker.Domain       | backend.md, architecture.md  |
| OneMoreTaskTracker.GitLab.Api   | dependencies.md, backend.md  |
| OneMoreTaskTracker.WebClient    | frontend.md, dependencies.md |
| OneMoreTaskTracker CLI          | backend.md, architecture.md  |

---

## Key Concepts

### Task State Lifecycle

```
NOT_STARTED → IN_DEV → MR_TO_RELEASE → IN_TEST → MR_TO_MASTER → COMPLETED
```

See **data.md** for detailed state transitions and determination logic.

### Handler Pattern

One class per use-case (e.g., `CreateTaskHandler`, `FindMrHandler`):
- Inherits from gRPC service base class
- Dependency injection via constructor
- Async/await with streaming support
- Maps domain models to proto DTOs

See **backend.md** for examples.

### Repository Pattern

Abstract data access behind interfaces (IProjectsProvider, IMrsProvider):
- Enables swapping implementations
- Simplifies testing with mocks
- Keeps business logic decoupled from data source

See **backend.md** for provider implementations.

### gRPC Service Communication

Inter-service communication via gRPC with streaming:
```
Tasks Service (client)
  → Proxy Service gRPC endpoints
    → GitLab REST API
```

See **architecture.md** for communication diagram.

---

## File Structure Summary

```
docs/CODEMAPS/
├── INDEX.md              (This file)
├── architecture.md       (System design overview)
├── backend.md            (Services, handlers, domain logic)
├── frontend.md           (React components, API client)
├── data.md               (Database schema, task states)
└── dependencies.md       (External APIs, packages, config)
```

---

## Entry Points

### Applications

- **OneMoreTaskTracker CLI:** `/OneMoreTaskTracker/Program.cs` — Console app for DTR, RTM, MMR commands
- **Gitlab.Proxy Service:** `/OneMoreTaskTracker.GitLab.Proxy/Program.cs` — gRPC bridge to GitLab (port 5176)
- **Tasks Service:** `/OneMoreTaskTracker.Tasks/Program.cs` — Task management gRPC service (port 5102)
- **Users Service:** `/OneMoreTaskTracker.Users/Program.cs` — User auth gRPC service (port 5103)
- **API Gateway:** `/OneMoreTaskTracker.Api/Program.cs` — REST gateway with JWT auth (port 5000)
- **Frontend:** `/OneMoreTaskTracker.WebClient/src/main.tsx` — React app entry point (port 5173)

### Key Domain Classes

- **DtrHandler:** `/OneMoreTaskTracker.Domain/DevToRelease/DtrHandler.cs`
- **RtmHandler:** `/OneMoreTaskTracker.Domain/ReleaseToMaster/RtmHandler.cs`
- **MmrHandler:** `/OneMoreTaskTracker.Domain/MergeMrs/MmrHandler.cs`

### gRPC Handlers

- **CreateTaskHandler:** `/OneMoreTaskTracker.Tasks/Tasks/Create/CreateTaskHandler.cs`
- **GetTaskHandler:** `/OneMoreTaskTracker.Tasks/Tasks/Get/GetTaskHandler.cs`
- **FindMrHandler:** `/OneMoreTaskTracker.GitLab.Proxy/Services/FindMrHandler.cs`
- **CreateMrHandler:** `/OneMoreTaskTracker.GitLab.Proxy/Services/CreateMrHandler.cs`

---

## Development Workflow

1. **Understand the system** → Read [architecture.md](architecture.md)
2. **Choose your area** (backend/frontend/data) → Read relevant codemap
3. **Find entry points** → Use Quick Navigation above
4. **Review examples** → See handler implementations in [backend.md](backend.md)
5. **Check integration points** → Refer to [dependencies.md](dependencies.md)

---

## Related Resources

- **CLAUDE.md** — Project structure and build instructions
- **OneMoreTaskTracker.slnx** — Solution file (build with `dotnet build`)
- **compose.yaml** — Docker Compose for local development
- **Proto files** — Located in each service's `/Protos/` directory

---

## Future Documentation

- [ ] Testing strategy and examples (xUnit, Testcontainers)
- [ ] Performance optimization guidelines
- [ ] gRPC streaming patterns
- [ ] Error handling and validation
- [ ] Refresh token flow documentation
- [ ] Production deployment guide (Docker Compose, TLS, env vars)
