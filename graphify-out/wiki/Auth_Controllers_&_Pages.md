# Auth Controllers & Pages

> 22 nodes · cohesion 0.13

## Key Concepts

- **TasksController** (10 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **.MapState()** (6 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **AuthController** (4 connections) — `OneMoreTaskTracker.Api/Controllers/AuthController.cs`
- **.CreateTask()** (4 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **.GetTeamMemberIds()** (4 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **.MoveTask()** (4 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **.Login()** (3 connections) — `OneMoreTaskTracker.Api/Controllers/AuthController.cs`
- **.DefaultFirstPushDate()** (3 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **.GetTask()** (3 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **.GetTasks()** (3 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **ControllerBase** (2 connections)
- **handleSubmit()** (2 connections) — `OneMoreTaskTracker.WebClient/src/features/auth/RegisterPage.tsx`
- **handleMoveConfirm()** (2 connections) — `OneMoreTaskTracker.WebClient/src/features/tasks/TaskDetailPage.tsx`
- **handleSubmit()** (2 connections) — `OneMoreTaskTracker.WebClient/src/features/tasks/TaskPage.tsx`
- **.LogAndReturnUnknown()** (2 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **.GetTeamMemberIds_ReturnsIdsOfMembersWithMatchingManagerId()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.GetTeamMemberIds_WhenNoMembers_ReturnsEmptyList()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **AuthController.cs** (1 connections) — `OneMoreTaskTracker.Api/Controllers/AuthController.cs`
- **TasksController.cs** (1 connections) — `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- **RegisterPage.tsx** (1 connections) — `OneMoreTaskTracker.WebClient/src/features/auth/RegisterPage.tsx`
- **TaskDetailPage.tsx** (1 connections) — `OneMoreTaskTracker.WebClient/src/features/tasks/TaskDetailPage.tsx`
- **TaskPage.tsx** (1 connections) — `OneMoreTaskTracker.WebClient/src/features/tasks/TaskPage.tsx`

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.Api/Controllers/AuthController.cs`
- `OneMoreTaskTracker.Api/Controllers/TasksController.cs`
- `OneMoreTaskTracker.WebClient/src/features/auth/RegisterPage.tsx`
- `OneMoreTaskTracker.WebClient/src/features/tasks/TaskDetailPage.tsx`
- `OneMoreTaskTracker.WebClient/src/features/tasks/TaskPage.tsx`
- `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`

## Audit Trail

- EXTRACTED: 51 (81%)
- INFERRED: 12 (19%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*