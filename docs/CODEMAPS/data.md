<!-- Generated: 2026-04-03 | Files scanned: 18 | Token estimate: ~900 -->

# OneMoreTaskTracker Data Model & Task State Codemap

**Last Updated:** 2026-04-03
**Database:** PostgreSQL (Npgsql driver, Entity Framework Core with migrations)
**ORM:** EF Core with DbContext pattern, schema-per-microservice

## Task State Lifecycle

**Defined in:** `/OneMoreTaskTracker.Tasks/Protos/task_state.proto`

```protobuf
enum TaskState {
  NOT_STARTED = 0;    // Initial state, no commits
  IN_DEV = 1;         // Developer is working (new projects found)
  MR_TO_RELEASE = 2;  // MR created from dev branch
  IN_TEST = 3;        // Merged to release, testing phase
  MR_TO_MASTER = 4;   // MR created from release to master
  COMPLETED = 5;      // Merged to master
}
```

### State Transitions

```
NOT_STARTED
    ↓ (User commits to task branch)
  IN_DEV
    ↓ (DTR: Create release branch + MR)
  MR_TO_RELEASE
    ↓ (Manual review & merge)
  IN_TEST
    ↓ (RTM: Create MR to master branch)
  MR_TO_MASTER
    ↓ (Manual review & merge)
  COMPLETED
```

### State Determination Logic

State transitions are **encapsulated inside `Task.AddMr()` and `Task.AddProject()`** — not computed externally.

```csharp
// Task.AddMr — state machine by TargetBranch:
// dev→release MR found:
//   NotStarted  → MrToRelease
//   MrToMaster  → MrToRelease (downgrade: earlier stage MR discovered)
// release→master MR found:
//   NotStarted  → MrToMaster

// Task.AddProject — fallback when no MRs found:
//   NotStarted → InDev

// CreateTaskHandler search order:
// 1. Find opened MRs by jiraId → call task.AddMr per MR
// 2. If no MRs found → search projects → call task.AddProject
// Default: NOT_STARTED (no MRs, no repos)
```

Key change from prior implementation: state is no longer determined by label inspection (`Labels.Contains("dev")`); it is determined by `TargetBranch` of the opened MR.

---

## Database Schema

Two separate databases, one per microservice (schema-per-microservice pattern).

### Tasks Database (`OneMoreTaskTracker.Tasks`)

**Context:** `/OneMoreTaskTracker.Tasks/Tasks/Data/TasksDbContext.cs`
**Migrations:** `/OneMoreTaskTracker.Tasks/Migrations/` — auto-applied on startup

```csharp
public class TasksDbContext(DbContextOptions<TasksDbContext> options) : DbContext(options)
{
    public DbSet<Task> Tasks { get; set; }
    public DbSet<GitRepo> GitRepos { get; set; }
    public DbSet<MergeRequest> MergeRequests { get; set; }
}
```

### Table: Tasks

```
Tasks (PK: Id)
├── Id (int, PK, Identity)
├── JiraId (string, required)
├── State (int, default 0)        — mutated via Task.AddMr / Task.AddProject
└── Relationships
    ├── MergeRequests (1:N) — Related MRs for this task
    └── GitRepos (1:N) — Projects involved in task
```

**EF Model (class, not record — state machine mutations):**
```csharp
public class Task
{
    public int Id { get; init; }
    public required string JiraId { get; init; }
    public int State { get; private set; }   // Only mutated via AddMr / AddProject
    public List<MergeRequest> MergeRequests { get; init; } = [];
    public List<GitRepo> GitRepos { get; init; } = [];

    // State machine: transitions based on MR TargetBranch
    public void AddMr(IMrInfo mr) { ... }
    // Sets InDev if State is still NotStarted
    public void AddProject(GitRepo repo) { ... }
}
```

**Why class over record:** Records imply value semantics; `Task` has identity and encapsulated mutation — class with `private set` correctly models this.

---

### Table: GitRepos

```
GitRepos (PK: Id)
├── Id (int, PK, Identity)
├── ExternalId (int)           — GitLab project ID
├── TaskId (int, FK)           — Reference to Task
├── Name (string, required)    — Project name
└── Link (string, required)    — Project URL
```

**EF Model:**
```csharp
public record GitRepo
{
    public int Id { get; init; }
    public int ExternalId { get; init; }
    public int TaskId { get; init; }
    public required string Name { get; init; }
    public required string Link { get; init; }
}
```

**Purpose:** Track which GitLab projects are involved in this task.

---

### Table: MergeRequests

```
MergeRequests (PK: Id)
├── Id (int, PK, Identity)
├── TaskId (int, FK)           — Explicit FK to Task (added)
├── ExternalProjectId (int)    — GitLab project ID
├── ExternalId (int)           — GitLab MR IID
├── Title (string, required)   — MR title
├── Link (string, required)    — GitLab MR URL
└── Labels (string[], default []) — MR labels
```

**EF Model:**
```csharp
public record MergeRequest
{
    public int Id { get; init; }
    public int TaskId { get; init; }           // Explicit FK (added alongside GitRepo)
    public int ExternalProjectId { get; init; }
    public int ExternalId { get; init; }
    public required string Title { get; init; }
    public required string Link { get; init; }
    public string[] Labels { get; init; } = [];
}
```

**Purpose:** Store discovered MRs from GitLab for quick querying.

---

### Users Database (`OneMoreTaskTracker.Users`)

**Context:** `/OneMoreTaskTracker.Users/Data/UsersDbContext.cs`
**Migrations:** `/OneMoreTaskTracker.Users/Migrations/` — auto-applied on startup
**Connection:** `Host=localhost;Port=5432;Database=Users`

### Table: Users

```
Users (PK: Id)
├── Id (int, PK, Identity)
├── Email (string, required, unique)
├── PasswordHash (string, required)  — BCrypt hash (work factor 12)
├── Role (string, required)          — "Developer" | "Manager"
└── ManagerId (int?, FK → Users.Id)  — Self-referential: developer's manager
```

**EF Model:**
```csharp
public class User
{
    public int Id { get; init; }
    public required string Email { get; init; }
    public required string PasswordHash { get; set; }
    public required string Role { get; set; }           // "Developer" | "Manager"
    public int? ManagerId { get; set; }
    public User? Manager { get; init; }
    public List<User> TeamMembers { get; init; } = [];
}
```

---

## Proto Message Models

### TaskDto (CreateTaskResponse)

**File:** `/OneMoreTaskTracker.Tasks/Protos/CreateTaskCommand/create_task_command_handler.proto`

```protobuf
message TaskDto {
  int32 id = 1;
  string jira_task_id = 2;
  TaskState state = 3;
}

message CreateTaskRequest {
  string jira_task_id = 1;
  int32 userId = 2;
  google.protobuf.Timestamp start_date = 3;
}

message CreateTaskResponse {
  TaskDto task = 1;
  repeated ProjectDto projects = 2;
  repeated MergeRequestDto merge_requests = 3;
}
```

### MoveTaskCommand / Response

**File:** `/OneMoreTaskTracker.Tasks/Protos/MoveTaskCommand/move_task.proto`

```protobuf
message MoveTaskCommand {
  int32 user_id = 1;
  string task_id = 2;
  google.protobuf.Timestamp first_push_date = 3;
}

message MoveTaskResponse {
  TaskState state = 1;
  repeated TaskProjectDto projects = 2;
}
```

---

## Domain Models

**File:** `/OneMoreTaskTracker.Domain/`

### MergeRequest (Abstract)

```csharp
public abstract record MergeRequest(
    int ProjectId,
    string ProjectName,
    string Title,
    string SourceBranch,
    string TargetBranch);
```

### MrToRelease (Dev → Release)

```csharp
public record MrToRelease(
    int ProjectId,
    string ProjectName,
    string Title,
    string SourceBranch,
    string TargetBranch) : MergeRequest(ProjectId, ProjectName, Title, SourceBranch, TargetBranch)
{
    public static MrToRelease Create(Project project, string mrTitle)
        => new(project.Id, project.Name, mrTitle, project.DevBranch, project.ReleaseBranch);
}
```

### MrToMaster (Release → Master)

```csharp
public record MrToMaster(
    int ProjectId,
    string ProjectName,
    string Title,
    string SourceBranch,
    string TargetBranch) : MergeRequest(ProjectId, ProjectName, Title, SourceBranch, TargetBranch)
```

### Project

```csharp
public record Project(int Id, string Name)
{
    internal string DevBranch { get; private set; }
    internal string TaskName { get; private set; }
    internal string ReleaseBranch => TaskName + "/release";

    internal Project Enrich(IEvent @event)
    {
        DevBranch = @event.Branch;
        TaskName = @event.TaskName;
        return this;
    }
}
```

---

## Data Flow

### Creating a Task

```
User Input (Jira ID)
    ↓
CreateTaskHandler.Create(CreateTaskRequest)
    ├─ Create Task(JiraId, State=0)
    ├─ Save to DB
    ├─ FindDevMerged(jiraId)
    │  ├─ Query MrFinder gRPC service
    │  └─ Check labels for "dev"
    ├─ Update State (IN_DEV or IN_TEST)
    ├─ Get(userId, jiraId, startDate)
    │  ├─ Query EventsFinder → push events
    │  ├─ Query ProjectGetter → project details
    │  └─ Populate GitRepos
    ├─ Final State = IN_DEV
    └─ Stream CreateTaskResponse (task, projects, mrs)
```

### Getting Task Status

```
GetTaskHandler.Get(GetTaskRequest)
    ├─ FindDevMerged(taskId)
    │  └─ If found → State = IN_TEST
    └─ Else Get(userId, taskId, firstPushDate)
       └─ Projects found → State = IN_DEV, else NOT_STARTED
```

---

## Configuration

**Connection String:** `appsettings.json` in `OneMoreTaskTracker.Tasks`

```json
{
  "ConnectionStrings": {
    "TasksContext": "Host=localhost;Port=5432;Database=Tasks;Username=postgres;Password=..."
  }
}
```

**Entity Framework:**
- Driver: `Npgsql` (PostgreSQL)
- DbContextPool for connection pooling
- Implicit usings, nullable reference types enabled

---

## Relationships

### Tasks Database

```
Task (1) ──────────────> (N) MergeRequest
    │                        ├─ TaskId (explicit FK)
    │                        ├─ ExternalProjectId
    │                        └─ ExternalId (GitLab MR IID)
    │
    └──────────────> (N) GitRepo
                         ├─ TaskId (FK)
                         ├─ ExternalId (GitLab project ID)
                         └─ Name, Link
```

### Users Database

```
User (1) ──────────────> (N) User
    Manager                   TeamMembers
    (self-referential via ManagerId)
```

---

## Migrations

Both services apply EF Core migrations automatically on startup:

```csharp
// In Program.cs of each service:
using var scope = app.Services.CreateScope();
scope.ServiceProvider.GetRequiredService<TDbContext>().Database.Migrate();
```

Migration files located at:
- `/OneMoreTaskTracker.Tasks/Migrations/20260402163545_InitialCreate.*`
- `/OneMoreTaskTracker.Users/Migrations/20260402163547_InitialCreate.*`

---

## Future Enhancements

- Add Task.CreatedAt, UpdatedAt timestamps
- Add audit log table for state transitions
- Add Task.Description, ParentTaskId (subtasks)
- Add index on JiraId for faster queries
- Implement soft deletes for archived tasks
- Refresh token flow with revocation (JWT currently long-lived 8h)

---

## Related Codemaps

- See [backend.md](backend.md) for handler logic that manipulates this data
- See [architecture.md](architecture.md) for how external systems feed data into tables
