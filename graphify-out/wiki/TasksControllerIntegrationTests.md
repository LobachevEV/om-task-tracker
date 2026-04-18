# TasksControllerIntegrationTests

> God node · 31 connections · `tests/OneMoreTaskTracker.Api.Tests/Controllers/TasksControllerIntegrationTests.cs`

## Connections by Relation

### contains
- [[TasksControllerIntegrationTests.cs]] `EXTRACTED`

### inherits
- [[IClassFixture]] `EXTRACTED`

### method
- [[.GetTokenForDeveloper()]] `EXTRACTED`
- [[.CreateStreamingCall()]] `EXTRACTED`
- [[.GrpcCall()]] `EXTRACTED`
- [[.CreateTask_WithValidPayload_Returns200WithTaskResponse()]] `EXTRACTED`
- [[.CreateTask_WithCustomStartDate_PassesItToService()]] `EXTRACTED`
- [[.CreateTask_PassesUserIdToService()]] `EXTRACTED`
- [[.GetTokenForManager()]] `EXTRACTED`
- [[.GetTasks_WithDeveloperRole_ReturnsTasksForUserOnly()]] `EXTRACTED`
- [[.GetTasks_WithManagerRole_FetchesTeamMemberIds()]] `EXTRACTED`
- [[.GetTasks_WithEmptyResult_ReturnsEmptyList()]] `EXTRACTED`
- [[.GetTasks_MapsAllTaskStates()]] `EXTRACTED`
- [[.GetTask_WithValidId_ReturnsTaskDetail()]] `EXTRACTED`
- [[.GetTask_PassesCorrectUserIdToService()]] `EXTRACTED`
- [[.GetTask_WithMultipleProjectsAndMRs_ReturnsAll()]] `EXTRACTED`
- [[.CreateTask_WithNoResponses_Returns500()]] `EXTRACTED`
- [[.MoveTask_WithValidId_ReturnsNewState()]] `EXTRACTED`
- [[.MoveTask_PassesCorrectUserIdAndTaskId()]] `EXTRACTED`
- [[.MoveTask_WithMultipleProjects_ReturnsAll()]] `EXTRACTED`
- [[.MoveTask_MapsAllFinalStates()]] `EXTRACTED`
- [[.CreateTask_WithInvalidJiraId_Returns400()]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*