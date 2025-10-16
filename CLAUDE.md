# OneMoreTaskTracker

A distributed system for managing GitLab merge requests and tasks via a microservice architecture.

## Tech Stack

- **Backend:** C# / .NET 10.0, ASP.NET Core, gRPC (Grpc.AspNetCore), Entity Framework Core, PostgreSQL (Npgsql)
- **Frontend:** React 19, TypeScript, Vite
- **IPC:** gRPC with Protocol Buffers (proto3)
- **Mapping:** Mapster

## Project Structure

```
OneMoreTaskTracker/                  # Console CLI app (DTR, RTM, MMR commands)
OneMoreTaskTracker.Domain/           # Core domain logic (workflows, interfaces, models)
OneMoreTaskTracker.GitLab.Api/       # GitLab HTTP API client
OneMoreTaskTracker.GitLab.Proxy/     # gRPC proxy service → GitLab API (port 5176/7163)
OneMoreTaskTracker.Tasks/            # Task management gRPC service + PostgreSQL (port 5102/7174)
OneMoreTaskTracker.Api/              # RESTful API (new, in progress)
OneMoreTaskTracker.WebClient/        # React + TypeScript frontend (Vite)
```

## Build & Run

```bash
# Restore and build all .NET projects
dotnet restore
dotnet build

# Run individual services
dotnet run --project OneMoreTaskTracker.GitLab.Proxy
dotnet run --project OneMoreTaskTracker.Tasks

# Frontend
cd OneMoreTaskTracker.WebClient
npm install
npm run dev
```

## Architecture

- **OneMoreTaskTracker.GitLab.Proxy** — translates gRPC calls into GitLab REST API requests; streams results back
- **OneMoreTaskTracker.Tasks** — manages task lifecycle (NOT_STARTED → IN_DEV → MR_TO_RELEASE → IN_TEST → MR_TO_MASTER → COMPLETED), backed by PostgreSQL
- **OneMoreTaskTracker.Domain** — domain workflows: DevToRelease (DTR), ReleaseToMaster (RTM), MergeMrs (MMR)
- **OneMoreTaskTracker.GitLab.Api** — low-level HTTP client for GitLab API (branches, events, MRs, projects)
- **OneMoreTaskTracker CLI** — command-line tool that orchestrates domain workflows
- **OneMoreTaskTracker.WebClient** — browser UI (communicates with gRPC services via API layer)

## Key Configuration

- GitLab base URL: `appsettings.json` in `OneMoreTaskTracker.GitLab.Proxy`
- PostgreSQL connection: `appsettings.json` in `OneMoreTaskTracker.Tasks` (localhost:5432, db: Tasks)
- Kestrel configured for HTTP/2 (gRPC) in both services

## Docker

Both `OneMoreTaskTracker.GitLab.Proxy` and `OneMoreTaskTracker.Tasks` have Dockerfiles with multi-stage builds:
- Base image: `mcr.microsoft.com/dotnet/aspnet:10.0`
- Exposed ports: 8080 (HTTP/2), 8081 (HTTPS)

## Planning Workflow

Before implementing any task:

1. **Start with `docs/`** — read the relevant files in the `docs/` folder to understand the domain, data model, architecture, and component interactions
2. **Identify components** — based on `docs/`, determine which services, handlers, entities, and proto messages are involved
3. **Then read code** — only after understanding the design, navigate to the relevant source files

The `docs/` folder is the source of truth for domain logic and architecture decisions.

## Code Conventions

- Nullable reference types enabled across all C# projects
- Implicit usings enabled
- Proto files grouped by domain area under `Protos/` in each service
- Handler pattern: one class per use-case (e.g. `CreateTaskHandler`, `FindMrHandler`)
- No test projects currently exist
