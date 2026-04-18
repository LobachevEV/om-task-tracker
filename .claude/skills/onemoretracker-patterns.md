---
name: onemoretracker-patterns
description: Coding patterns extracted from OneMoreTaskTracker repository — gRPC handlers, microservice structure, EF Core, frontend conventions, and CSS architecture
version: 1.1.0
source: local-git-analysis
analyzed_commits: 68
---

# OneMoreTaskTracker Patterns

## Commit Conventions

This project uses **conventional commits** where possible:

- `feat:` — New features (most common)
- `fix:` — Bug fixes
- `docs:` — Documentation updates (CODEMAPS)
- `chore:` — Merges, maintenance (worktree merges, .gitignore)
- `refactor:` — Structural changes without behavior change

Multi-line commit bodies are used for large changes — list every design decision
that future readers need to understand (see task state machine commit as reference).

## Backend Architecture

### Handler Pattern (One class per use-case)

Each operation gets its own folder and handler class:

```
OneMoreTaskTracker.Tasks/
├── Tasks/
│   ├── Create/
│   │   └── CreateTaskHandler.cs     ← inherits generated gRPC base
│   ├── Get/
│   │   └── GetTaskHandler.cs
│   ├── List/
│   │   └── ListTasksHandler.cs
│   └── Data/
│       ├── TasksDbContext.cs
│       ├── Task.cs
│       └── MergeRequest.cs
```

### Proto → Handler Naming

Proto service name determines the C# base class. Example:

```proto
service TaskCreator {
  rpc Create(CreateTaskRequest) returns (stream CreateTaskResponse);
}
```

```csharp
public class CreateTaskHandler(...) : TaskCreator.TaskCreatorBase
```

### Streaming Responses

Prefer server-streaming (`returns (stream ...)`) for operations that produce
incremental results (task creation with MR lookup, events streaming):

```csharp
public override async Task Create(
    CreateTaskRequest request,
    IServerStreamWriter<CreateTaskResponse> responseStream,
    ServerCallContext context)
{
    // Emit initial state immediately, then enrich
    await responseStream.WriteAsync(new CreateTaskResponse { Task = task.Adapt<TaskDto>() });
    // ... do async work ...
    await responseStream.WriteAsync(enrichedResponse);
}
```

### CancellationToken Propagation

Always thread `context.CancellationToken` through every async call:

```csharp
await tasksDbContext.Tasks.AddAsync(task, context.CancellationToken);
await tasksDbContext.SaveChangesAsync(context.CancellationToken);
await foreach (var mr in provider.Find(jiraId, "opened", context.CancellationToken))
```

### Mapster for DTO Mapping

Use `Adapt<T>()` directly — no manual mapping:

```csharp
await responseStream.WriteAsync(new CreateTaskResponse
{
    Task = task.Adapt<TaskDto>(),
    MergeRequests = { task.MergeRequests.Adapt<MergeRequestDto[]>() }
});
```

### IAsyncEnumerable for Streaming Providers

Interfaces that fetch from external services (GitLab) return `IAsyncEnumerable`:

```csharp
public interface IMrsProvider
{
    IAsyncEnumerable<IMrInfo> Find(string jiraId, string state, CancellationToken ct);
}
```

### State Machine: switch expressions

Task state transitions use switch expressions, not if/else chains:

```csharp
public void AddMr(IMrInfo mr)
{
    State = (State, mr.TargetBranch) switch
    {
        (TaskState.NotStarted, "release") => TaskState.MrToRelease,
        (TaskState.NotStarted, "master")  => TaskState.MrToMaster,
        (TaskState.MrToMaster, "release") => TaskState.MrToRelease,
        _ => State
    };
}
```

### Interface-Based Decoupling

Use interfaces to decouple domain from proto types:

```csharp
// Instead of depending on MrDto directly:
public interface IMrInfo
{
    string Id { get; }
    string Title { get; }
    string SourceBranch { get; }
    string TargetBranch { get; }
    string[] Labels { get; }
}

// Implement via partial class on generated type:
public partial class MrDto : IMrInfo
{
    public string[] Labels => _labels ??= base.Labels.ToArray();
    private string[]? _labels;
}
```

### EF Core: Schema-Per-Microservice

Each service owns its schema in a shared PostgreSQL server:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.HasDefaultSchema("tasks"); // isolated schema
}
```

Use `Database.Migrate()` (not `EnsureCreated()`) in `Program.cs`.

## Proto File Organization

```
OneMoreTaskTracker.Tasks/Protos/
├── CreateTaskCommand/
│   └── create_task_command_handler.proto
├── GetTaskQuery/
│   └── get_task_query_handler.proto
├── ListTasksQuery/
│   └── list_tasks_query_handler.proto
├── MoveTaskCommand/
│   └── move_task.proto
├── Clients/                  ← mirrored copies from Proxy
│   ├── MergeRequests/
│   ├── Branches/
│   └── ...
└── task_state.proto          ← shared enum
```

Naming convention: `{operation}_{handler_type}.proto` — command vs query separation.

## Frontend Architecture (WebClient)

Feature-based structure under `src/`:

```
src/
├── app/
│   └── App.tsx               ← router, providers
├── features/
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── ProtectedRoute.tsx
│   └── tasks/
│       ├── TaskPage.tsx
│       └── TaskDetailPage.tsx
├── shared/
│   ├── api/
│   │   ├── httpClient.ts
│   │   ├── authApi.ts
│   │   ├── tasksApi.ts
│   │   ├── schemas.ts         ← Zod validation schemas
│   │   └── __tests__/
│   ├── auth/
│   │   ├── auth.ts
│   │   └── __tests__/
│   ├── components/
│   │   ├── AppHeader.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── Spinner.tsx
│   ├── hooks/
│   │   ├── useTaskDetail.ts
│   │   └── __tests__/
│   ├── types/
│   │   ├── auth.ts
│   │   └── task.ts
│   └── constants/
│       └── taskConstants.ts
└── test/
    └── setup.ts
```

Test files live in `__tests__/` sibling directories. Framework: Vitest.

## Co-change Patterns

Files that change together — update all when touching one:

| Change trigger | Files to update |
|---|---|
| New gRPC operation | proto file + handler class + client proto copy |
| New API endpoint | `TasksController.cs` + `tasksApi.ts` + `schemas.ts` |
| New domain entity | EF entity class + DbContext + migration |
| Architecture change | `docs/CODEMAPS/*.md` + `CLAUDE.md` |
| New microservice | `OneMoreTaskTracker.slnx` + `Program.cs` + `Dockerfile` + appsettings |

## CSS Architecture (WebClient)

Styles are split by concern and colocated with components to prevent parallel-agent merge collisions. Design tokens live at the root of `src/styles/`; primitives live one level down; component-specific styles live next to the `.tsx` file that owns them.

```
src/styles/
├── tokens.css              ← OKLCH colors, shadows, motion, z-index (owner: /colorize)
├── typography.css          ← font-family vars, h1-h6 display (owner: /typeset)
├── reset.css               ← box-sizing, body/a/button defaults
└── primitives/
    ├── button.css          ← .primary-button, .secondary-button
    ├── field.css           ← .field, .field__input, .error-text
    ├── card.css            ← .card shell
    └── role-badge.css

src/shared/components/
├── AppHeader.{tsx,css}     ← colocated
├── ConfirmDialog.{tsx,css}
├── Spinner.{tsx,css}
└── ShortcutLegend.{tsx,css}

src/features/{auth,tasks}/
└── {Component}.{tsx,css}   ← colocated per component
```

`src/index.css` is an `@import` aggregator only. Each component `.tsx` imports its own `.css`.

**`.gitattributes` sets `*.css merge=union`** as a safety net for cases where two agents must touch the same CSS file — union merge keeps both additions instead of producing conflict markers.

## Design Tokens: OKLCH-first

All color values use `oklch()` for perceptually uniform ramps. Transparency uses `color-mix(in oklch, var(--x) N%, transparent)` — never the invalid `var(--x) / 0.15` syntax.

```css
:root {
  --bg: oklch(0.12 0.010 60);
  --accent: oklch(0.75 0.14 85);
  --accent-hover: oklch(0.80 0.14 85);

  --state-in-dev: oklch(0.75 0.14 85);
  --state-in-test: oklch(0.68 0.12 250);
  --state-completed: oklch(0.65 0.10 145);

  --font-sans: 'Onest', system-ui, sans-serif;
  --font-display: 'Geologica', sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  --shadow-sm: 0 1px 2px oklch(0 0 0 / 0.3);
  --shadow-lg: 0 12px 30px oklch(0 0 0 / 0.45);
  --transition-fast: 120ms;
  --transition-base: 160ms;
  --z-header: 10;
  --z-popover: 40;
  --z-modal: 50;
}
```

## Parallel Agent Worktree Strategy

When dispatching 2+ agents to parallel git worktrees on design or refactor tasks, consult `.impeccable.md` for the task ownership matrix. Each task type (`/colorize`, `/typeset`, `/animate`, `/quieter`, `/adapt`, `/shape`, `/layout`) owns specific files or token categories. Enforcing file-level partitioning structurally beats prompt-level "please don't touch X" instructions.

## JWT Auth: Gateway-Only Pattern

JWT authentication is handled exclusively in `OneMoreTaskTracker.Api` (the REST gateway).
Individual gRPC microservices (Tasks, Users) do NOT validate tokens — they trust
the gateway. The API uses `ClaimsPrincipalExtensions` to extract user IDs from
claims.