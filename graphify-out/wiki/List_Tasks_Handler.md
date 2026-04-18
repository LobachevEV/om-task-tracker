# List Tasks Handler

> 10 nodes · cohesion 0.40

## Key Concepts

- **ListTasksHandlerTests** (7 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/List/ListTasksHandlerTests.cs`
- **.ListTasks()** (6 connections) — `OneMoreTaskTracker.Tasks/Tasks/List/ListTasksHandler.cs`
- **.CreateDb()** (6 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/List/ListTasksHandlerTests.cs`
- **.ListTasks_AsDeveloper_ReturnsOnlyOwnTasks()** (3 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/List/ListTasksHandlerTests.cs`
- **.ListTasks_AsManager_ReturnsTeamMemberTasks()** (3 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/List/ListTasksHandlerTests.cs`
- **.ListTasks_LimitedTo500Tasks()** (3 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/List/ListTasksHandlerTests.cs`
- **.ListTasks_ResultsOrderedByIdDescending()** (3 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/List/ListTasksHandlerTests.cs`
- **.ListTasks_WithUnknownRole_ReturnsEmpty()** (3 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/List/ListTasksHandlerTests.cs`
- **ListTasksHandler** (2 connections) — `OneMoreTaskTracker.Tasks/Tasks/List/ListTasksHandler.cs`
- **ListTasksHandler.cs** (1 connections) — `OneMoreTaskTracker.Tasks/Tasks/List/ListTasksHandler.cs`

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.Tasks/Tasks/List/ListTasksHandler.cs`
- `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/List/ListTasksHandlerTests.cs`

## Audit Trail

- EXTRACTED: 27 (73%)
- INFERRED: 10 (27%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*