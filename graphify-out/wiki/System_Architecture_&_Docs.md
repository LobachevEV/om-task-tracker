# System Architecture & Docs

> 44 nodes · cohesion 0.05

## Key Concepts

- **Microservice Architecture Design** (10 connections) — `docs/CODEMAPS/architecture.md`
- **External Dependencies & APIs** (8 connections) — `docs/CODEMAPS/dependencies.md`
- **OneMoreTaskTracker.Api (REST API Gateway)** (7 connections) — `docs/CODEMAPS/architecture.md`
- **Data Model & Task State Lifecycle** (6 connections) — `docs/CODEMAPS/data.md`
- **OneMoreTaskTracker.GitLab.Proxy (gRPC Service)** (6 connections) — `docs/CODEMAPS/architecture.md`
- **OneMoreTaskTracker.Tasks (gRPC Service)** (6 connections) — `docs/CODEMAPS/architecture.md`
- **AuthController (REST Endpoint)** (4 connections) — `docs/CODEMAPS/backend.md`
- **JWT Bearer Authentication (HMAC-SHA256)** (4 connections) — `docs/CODEMAPS/dependencies.md`
- **OneMoreTaskTracker.Users (gRPC Service)** (4 connections) — `docs/CODEMAPS/architecture.md`
- **OneMoreTaskTracker System** (3 connections) — `CLAUDE.md`
- **UserServiceHandler (User Registration & Auth)** (3 connections) — `docs/CODEMAPS/backend.md`
- **OneMoreTaskTracker.WebClient (React Frontend)** (3 connections) — `docs/CODEMAPS/architecture.md`
- **BCrypt Password Hashing (Work Factor 12)** (2 connections) — `docs/CODEMAPS/dependencies.md`
- **CreateTaskHandler (gRPC Handler)** (2 connections) — `docs/CODEMAPS/backend.md`
- **GitLab SaaS (External Service)** (2 connections) — `docs/CODEMAPS/dependencies.md`
- **PostgreSQL Database (Schema-Per-Microservice)** (2 connections) — `docs/CODEMAPS/data.md`
- **Role-Based Access Control (Developer/Manager)** (2 connections) — `docs/CODEMAPS/backend.md`
- **Task Class as State Machine (not record)** (2 connections) — `docs/CODEMAPS/data.md`
- **Task State Lifecycle (6 States)** (2 connections) — `docs/CODEMAPS/data.md`
- **OneMoreTaskTracker CLI (Console App)** (1 connections) — `docs/CODEMAPS/architecture.md`
- **Code Conventions: C# Best Practices** (1 connections) — `CLAUDE.md`
- **CORS Configuration for Frontend Origin** (1 connections) — `docs/CODEMAPS/dependencies.md`
- **CreateMrHandler (Merge Request Creation)** (1 connections) — `docs/CODEMAPS/backend.md`
- **Docker Multi-Stage Builds (ASP.NET 10.0)** (1 connections) — `docs/CODEMAPS/dependencies.md`
- **FindMrHandler (Merge Request Search)** (1 connections) — `docs/CODEMAPS/backend.md`
- *... and 19 more nodes in this community*

## Relationships

- No strong cross-community connections detected

## Source Files

- `CLAUDE.md`
- `OneMoreTaskTracker.WebClient/src/assets/react.svg`
- `docs/CODEMAPS/architecture.md`
- `docs/CODEMAPS/backend.md`
- `docs/CODEMAPS/data.md`
- `docs/CODEMAPS/dependencies.md`

## Audit Trail

- EXTRACTED: 97 (94%)
- INFERRED: 6 (6%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*