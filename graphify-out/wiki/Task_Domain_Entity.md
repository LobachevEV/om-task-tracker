# Task Domain Entity

> 23 nodes · cohesion 0.16

## Key Concepts

- **.AddMr()** (14 connections) — `OneMoreTaskTracker.Tasks/Tasks/Data/Task.cs`
- **TaskAddMrTests** (11 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddProject()** (10 connections) — `OneMoreTaskTracker.Tasks/Tasks/Data/Task.cs`
- **TaskAddProjectTests** (8 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddProjectTests.cs`
- **Task** (3 connections) — `OneMoreTaskTracker.Tasks/Tasks/Data/Task.cs`
- **.AddMr_WhenInDev_StateUnchanged()** (3 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddProject_WhenMrToMaster_StateUnchanged()** (3 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddProjectTests.cs`
- **.AddProject_WhenMrToRelease_StateUnchanged()** (3 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddProjectTests.cs`
- **.AddMr_AddsGitRepo_WhenRepoNotPresent()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddMr_DoesNotDuplicateGitRepo_WhenSameProjectId()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddMr_DuplicateIid_IsIgnored()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddMr_StoresMrFields_Correctly()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddMr_WhenMrToMasterAndTargetIsMaster_StateUnchanged()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddMr_WhenMrToMasterAndTargetIsNotMaster_SetsStateMrToRelease()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddMr_WhenMrToRelease_StateUnchanged()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddMr_WhenNotStartedAndTargetIsMaster_SetsStateMrToMaster()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddMr_WhenNotStartedAndTargetIsNotMaster_SetsStateMrToRelease()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- **.AddProject_AddsGitRepo_WhenNotPresent()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddProjectTests.cs`
- **.AddProject_DoesNotDuplicateGitRepo_WhenSameExternalId()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddProjectTests.cs`
- **.AddProject_StoresNameCorrectly()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddProjectTests.cs`
- **.AddProject_WhenInDev_StateUnchanged()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddProjectTests.cs`
- **.AddProject_WhenNotStarted_SetsStateInDev()** (2 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddProjectTests.cs`
- **Task.cs** (1 connections) — `OneMoreTaskTracker.Tasks/Tasks/Data/Task.cs`

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.Tasks/Tasks/Data/Task.cs`
- `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`
- `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddProjectTests.cs`

## Audit Trail

- EXTRACTED: 42 (50%)
- INFERRED: 42 (50%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*