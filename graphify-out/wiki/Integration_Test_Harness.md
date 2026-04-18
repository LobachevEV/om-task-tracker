# Integration Test Harness

> 37 nodes · cohesion 0.10

## Key Concepts

- **TasksControllerIntegrationTests** (31 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GetTokenForDeveloper()** (18 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.CreateStreamingCall()** (9 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GrpcCall()** (8 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GenerateToken()** (5 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.CreateTask_PassesUserIdToService()** (4 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.CreateTask_WithCustomStartDate_PassesItToService()** (4 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.CreateTask_WithValidPayload_Returns200WithTaskResponse()** (4 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **TasksControllerWebApplicationFactory** (4 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **ApiWebApplicationFactory** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/AuthControllerIntegrationTests.cs`
- **.CreateTask_WithNoResponses_Returns500()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GetTask_PassesCorrectUserIdToService()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GetTask_WithMultipleProjectsAndMRs_ReturnsAll()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GetTask_WithValidId_ReturnsTaskDetail()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GetTasks_MapsAllTaskStates()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GetTasks_WithDeveloperRole_ReturnsTasksForUserOnly()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GetTasks_WithEmptyResult_ReturnsEmptyList()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GetTasks_WithManagerRole_FetchesTeamMemberIds()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.GetTokenForManager()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.MoveTask_MapsAllFinalStates()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.MoveTask_PassesCorrectUserIdAndTaskId()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.MoveTask_WithMultipleProjects_ReturnsAll()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **.MoveTask_WithValidId_ReturnsNewState()** (3 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- **IClassFixture** (2 connections)
- **.CreateTask_WithInvalidJiraId_Returns400()** (2 connections) — `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`
- *... and 12 more nodes in this community*

## Relationships

- No strong cross-community connections detected

## Source Files

- `tests/OneMoreTaskTracker.Api.Tests/Controllers/AuthControllerIntegrationTests.cs`
- `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`

## Audit Trail

- EXTRACTED: 142 (96%)
- INFERRED: 6 (4%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*