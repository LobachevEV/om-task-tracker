---
name: efcore-schema-per-microservice
description: "EF Core schema-per-microservice: HasDefaultSchema + Migrate() replaces EnsureCreated()"
user-invocable: false
origin: auto-extracted
---

# EF Core Schema-Per-Microservice

**Extracted:** 2026-04-02
**Context:** OneMoreTaskTracker uses separate PostgreSQL schemas per microservice (tasks, users)

## Problem
Multiple microservices sharing a PostgreSQL server dump all tables into the `public`
schema, making ownership unclear and risking name collisions.

## Solution

1. Add `HasDefaultSchema` in each DbContext:
   ```csharp
   protected override void OnModelCreating(ModelBuilder modelBuilder)
   {
       modelBuilder.HasDefaultSchema("tasks"); // or "users"
   }
   ```

2. Replace `Database.EnsureCreated()` with `Database.Migrate()` in Program.cs
3. Generate initial migration: `dotnet ef migrations add InitialCreate --project <project>`
4. EF Core auto-creates the schema via `EnsureSchema` in the migration

## Gotcha: appsettings.Development.json Override
Check `appsettings.Development.json` — it can override the database name from
`appsettings.json`. Both must be consistent. Convention: DB name matches service
domain (Tasks service → `Tasks` DB, Users service → `Users` DB).

## Gotcha: `--no-build` produces empty migrations from stale DLLs

`dotnet ef migrations add` reflects over the **compiled** DbContext assembly,
not the source files. Passing `--no-build` skips compilation, so if you edited
the DbContext or entity since the last build, the migration diffs the model
against an outdated snapshot and generates empty `Up()`/`Down()` methods —
silently.

Always build first (or omit `--no-build`) after model changes:

```bash
dotnet build <Project>/<Project>.csproj
dotnet ef migrations add AddMyColumn --project <Project> --no-build
```

If you discover an empty migration, recover with:

```bash
dotnet ef migrations remove --force --project <Project>
dotnet build <Project>/<Project>.csproj
dotnet ef migrations add AddMyColumn --project <Project> --no-build
```

Symptom: the migration file compiles and runs but has zero column/index ops
inside `Up()`. The `ModelSnapshot` also still lacks the new properties.

## When to Use
- Adding a new microservice with its own DB tables
- Migrating from EnsureCreated() to proper EF Core migrations
- Ensuring schema isolation between services