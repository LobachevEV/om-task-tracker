<!-- Generated: 2026-04-03 | Files scanned: 60+ | Token estimate: ~950 -->

# OneMoreTaskTracker Architecture Codemap

**Last Updated:** 2026-04-03

## System Overview

OneMoreTaskTracker is a distributed system for managing GitLab merge requests and tasks via microservices. It orchestrates complex workflows for promoting code through development, testing, and release branches.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                            │
│                 OneMoreTaskTracker.WebClient (Vite)                      │
│            http://localhost:5173 (dev)                         │
│  Routes: /login, /register, / (protected → TaskPage)           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP REST + JWT Bearer
                             │
        ┌────────────────────▼────────────────────┐
        │         OneMoreTaskTracker.Api (REST Gateway)     │
        │         Port: 5000 (HTTP)               │
        │   POST /api/auth/register               │
        │   POST /api/auth/login                  │
        │   GET  /api/tasks        [Authorize]    │
        │   POST /api/tasks        [Authorize]    │
        └────────────┬──────────────┬─────────────┘
                     │              │ gRPC
                     │ gRPC         ▼
                     │  ┌───────────────────────────────┐
                     │  │   OneMoreTaskTracker.Users (gRPC)       │
                     │  │   Port: 5103 (HTTP/2)         │
                     │  │   - UserService.Register      │
                     │  │   - UserService.Authenticate  │
                     │  │   - UserService.GetTeamMemberIds │
                     │  │   Database: PostgreSQL (Users) │
                     │  └───────────────────────────────┘
                     │
                     ▼ gRPC
        ┌────────────────────────────────────────┐
        │   OneMoreTaskTracker.Tasks (gRPC Service)        │
        │   Port: 5102 (HTTP/2)                  │
        │   - TaskCreator.Create (streaming)     │
        │   - TaskLister.ListTasks               │
        │   Database: PostgreSQL (Tasks)          │
        └──────────────────┬─────────────────────┘
                           │ gRPC
                           ▼
        ┌──────────────────────────────────────────────────┐
        │        OneMoreTaskTracker.GitLab.Proxy (gRPC)              │
        │        Port: 5176 (HTTP/2)                       │
        │    - FindMrHandler (MrFinder.rpc Find)           │
        │    - CreateMrHandler (MrCreator.rpc Create)      │
        │    - MergeMrService (MrMerger.rpc Merge)         │
        │    - FindEventsHandler (EventsFinder.rpc Find)   │
        │    - GetProjectHandler (ProjectGetter.rpc Get)   │
        │    - CreateBranchHandler (BranchesCreator.rpc Create) │
        └────────────────────────┬─────────────────────────┘
                                 │
                     HTTP REST calls to GitLab API
                                 │
                    ┌────────────▼──────────────┐
                    │   GitLab (External SaaS)  │
                    │   - MR operations         │
                    │   - Branch management     │
                    │   - Project queries       │
                    │   - Event streams         │
                    └───────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      CLI Application                             │
│                       OneMoreTaskTracker (Console)                         │
│     Commands: DTR (Dev→Release), RTM (Release→Master),          │
│              MMR (Merge MRs)                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Entry Points

| Application   | Type         | Path                                | Port          | Language   |
|---------------|--------------|-------------------------------------|---------------|------------|
| OneMoreTaskTracker CLI  | Console      | `/OneMoreTaskTracker/Program.cs`              | N/A           | C# .NET    |
| GitLab Proxy  | gRPC Service | `/OneMoreTaskTracker.GitLab.Proxy/Program.cs` | 5176 (HTTP/2) | C# ASP.NET |
| Task Service  | gRPC Service | `/OneMoreTaskTracker.Tasks/Program.cs`        | 5102 (HTTP/2) | C# ASP.NET |
| Users Service | gRPC Service | `/OneMoreTaskTracker.Users/Program.cs`        | 5103 (HTTP/2) | C# ASP.NET |
| API Gateway   | REST         | `/OneMoreTaskTracker.Api/Program.cs`          | 5000 (HTTP)   | C# ASP.NET |
| Web Client    | React SPA    | `/OneMoreTaskTracker.WebClient/src/main.tsx`  | 5173 (dev)    | TypeScript |

## Core Namespaces

### Domain Logic (`OneMoreTaskTracker.Domain`)
- **DevToRelease (DTR):** `DtrHandler`, `DtrCommand` — Create release branches and MRs from dev
- **ReleaseToMaster (RTM):** `RtmHandler`, `RtmCommand` — Create MRs from release to master
- **MergeMrs (MMR):** `MmrHandler`, `MmrCommand` — Merge opened MRs
- **Models:** `Project`, `MergeRequest`, `MrToRelease`, `MrToMaster`, `Result`
- **Interfaces:** `IMrProvider`, `IMrCreator`, `IMrMerger`, `IProjectsProvider`, `IBranchCreator`, `IEventsProvider`

### GitLab API Client (`OneMoreTaskTracker.GitLab.Api`)
- **MrApiClient:** `/MergeRequests/` — Low-level GitLab MR HTTP calls
- **BranchesApiClient:** `/Branches/` — Branch creation/deletion
- **EventsApiClient:** `/Events/` — Push event querying
- **ProjectsApiClient:** `/Projects/` — Project metadata
- **GitLabApiClient:** Base HTTP client with token auth, object pooling

### gRPC Proxy (`OneMoreTaskTracker.GitLab.Proxy`)
- **Services:** `FindMrHandler`, `CreateMrHandler`, `MergeMrService`, `FindEventsHandler`, `GetProjectHandler`, `CreateBranchHandler`
- **Protos:** `/Protos/MergeRequests/`, `/Protos/Branches/`, `/Protos/Events/`, `/Protos/Projects/`
- Acts as bridge between gRPC clients and GitLab REST API

### Task Service (`OneMoreTaskTracker.Tasks`)
- **Handlers:** `CreateTaskHandler`, `GetTaskHandler`, `ListTasksHandler` (gRPC service base classes)
- **Database:** `TasksDbContext` (PostgreSQL via EF Core, schema: `tasks`)
- **Providers:** `IProjectsProvider` (EventBasedProjectsProvider), `IMrsProvider` (MrsProvider)
- **Models:** `Task` (class with state machine methods), `MergeRequest`, `GitRepo`

### Users Service (`OneMoreTaskTracker.Users`) _(new)_
- **Handler:** `UserServiceHandler` — Register, Authenticate, GetTeamMemberIds
- **Database:** `UsersDbContext` (PostgreSQL via EF Core, separate `Users` DB)
- **Models:** `User` — email, BCrypt password hash, role (Developer/Manager), optional managerId
- **Auth:** BCrypt password hashing (work factor 12)

### REST API Gateway (`OneMoreTaskTracker.Api`) _(new)_
- **Controllers:** `AuthController` (`/api/auth`), `TasksController` (`/api/tasks`)
- **Auth:** JWT Bearer tokens (HMAC-SHA256, configurable expiry, default 8h)
- **Roles:** `Developer`, `Manager` (managers see team members' tasks)
- **gRPC clients:** `TaskCreator`, `TaskLister`, `UserService`
- **Middleware:** `GrpcExceptionMiddleware` — maps gRPC status codes to HTTP

### Frontend (`OneMoreTaskTracker.WebClient`)
- **Pages:** `LoginPage`, `RegisterPage`, `TaskPage`
- **Auth:** `AuthContext` (React context), `ProtectedRoute`, `auth.ts` (localStorage)
- **Routing:** `react-router-dom` v7 (`/login`, `/register`, `/`)
- **API Layer:** `api.ts` — HTTP calls with JWT Authorization header
- **Build:** Vite + React 19 + TypeScript

## Communication Patterns

1. **CLI → GitLab API:** Direct HTTP via `GitLabApiClient`
2. **Tasks Service → Proxy:** gRPC clients for `MrFinder`, `MrCreator`, `MrMerger`, `EventsFinder`, `ProjectGetter`, `BranchesCreator`
3. **Frontend → API Gateway:** REST HTTP with JWT Bearer token
4. **API Gateway → Tasks:** gRPC (`TaskCreator`, `TaskLister`)
5. **API Gateway → Users:** gRPC (`UserService`)
6. **Proxy → GitLab:** HTTP REST with token authentication

## Authentication Flow

```
User (browser)
  → POST /api/auth/login {email, password}
    → API Gateway → gRPC UserService.Authenticate
      → UsersDbContext: find user, BCrypt.Verify
        ← {success, userId, email, role}
    ← JWT token (HMAC-SHA256, 8h default)
  → Subsequent requests: Authorization: Bearer <token>
    → API Gateway validates JWT → extracts userId + role
      → Controllers use User.GetUserId() / User.GetRole()
```

## Protocol Buffers

Proto package: `mr_helper.*` / `OneMoreTaskTracker.Proto.*`
Located in each service's `/Protos/` directory.
Key services: `MrFinder`, `MrCreator`, `MrMerger`, `EventsFinder`, `ProjectGetter`, `BranchesCreator`, `TaskCreator`, `TaskGetter`, `TaskLister`, `UserService`

## Key Technologies

- **Backend:** C# .NET 10.0, ASP.NET Core, Entity Framework Core
- **IPC:** gRPC with HTTP/2, Protocol Buffers (proto3)
- **Database:** PostgreSQL (Npgsql driver, EF Core migrations)
- **Auth:** JWT Bearer (Microsoft.AspNetCore.Authentication.JwtBearer), BCrypt.Net
- **Mapping:** Mapster (DTOs)
- **Frontend:** React 19, TypeScript, Vite, react-router-dom v7
- **CLI:** Console application with configuration/secrets management

## Related Codemaps

- See [backend.md](backend.md) for service-specific handler details
- See [frontend.md](frontend.md) for React component structure
- See [data.md](data.md) for database schema and task state lifecycle
- See [dependencies.md](dependencies.md) for external APIs and NuGet packages
