# EF Core DbContexts

> 7 nodes · cohesion 0.29

## Key Concepts

- **TasksDbContext** (3 connections) — `OneMoreTaskTracker.Tasks/Tasks/Data/TasksDbContext.cs`
- **UsersDbContext** (3 connections) — `OneMoreTaskTracker.Users/Data/UsersDbContext.cs`
- **DbContext** (2 connections)
- **TasksDbContext.cs** (1 connections) — `OneMoreTaskTracker.Tasks/Tasks/Data/TasksDbContext.cs`
- **UsersDbContext.cs** (1 connections) — `OneMoreTaskTracker.Users/Data/UsersDbContext.cs`
- **.OnModelCreating()** (1 connections) — `OneMoreTaskTracker.Tasks/Tasks/Data/TasksDbContext.cs`
- **.OnModelCreating()** (1 connections) — `OneMoreTaskTracker.Users/Data/UsersDbContext.cs`

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.Tasks/Tasks/Data/TasksDbContext.cs`
- `OneMoreTaskTracker.Users/Data/UsersDbContext.cs`

## Audit Trail

- EXTRACTED: 12 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*