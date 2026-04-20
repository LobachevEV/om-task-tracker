# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, email the maintainer at **e.v.lobachev2@gmail.com** with:

- A description of the issue
- Steps to reproduce
- The impact (who/what is affected)
- Any suggested fix, if known

You should receive an initial acknowledgement within **3 business days**. A fix or mitigation timeline will follow within **10 business days** depending on severity.

## Supported Versions

Only the `main` branch receives security fixes. There are no tagged releases.

## Scope

In scope:

- All services under `OneMoreTaskTracker.Api`, `OneMoreTaskTracker.Users`, `OneMoreTaskTracker.Tasks`, `OneMoreTaskTracker.GitLab.Proxy`
- The `OneMoreTaskTracker.WebClient` SPA
- Inter-service gRPC contracts (`Protos/`)
- JWT handling, role-based authorization, password hashing configuration

Out of scope:

- Issues that require attacker-controlled code running on the server host
- Social engineering, physical attacks, denial-of-service by resource exhaustion
- Vulnerabilities in third-party dependencies already flagged by `dotnet list package --vulnerable` or `npm audit` (report upstream)

## Handling Standards

When accepting a report we follow:

- Parameterized queries only — no string concatenation into SQL (EF Core enforces this)
- Secrets (JWT signing key, DB connection strings, GitLab token) are never committed; `.env` files are gitignored
- BCrypt work factor 12 for password hashing
- JWT validation at gateway; every gRPC service also authorizes against the propagated identity (see `~/.claude/rules/microservices/security.md`)
- No privilege-granting fields (`role`, `is_admin`) in any public contract

## Dependency Scanning

- CI runs `dotnet list package --vulnerable --include-transitive` on every push
- CI runs `npm audit --audit-level=high` for the SPA
- Dependabot alerts are enabled at the repository level
