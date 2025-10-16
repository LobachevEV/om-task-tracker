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

## When to Use
- Adding a new microservice with its own DB tables
- Migrating from EnsureCreated() to proper EF Core migrations
- Ensuring schema isolation between services