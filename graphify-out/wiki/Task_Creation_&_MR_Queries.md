# Task Creation & MR Queries

> 73 nodes · cohesion 0.06

## Key Concepts

- **.Find()** (36 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/FindMrHandler.cs`
- **.Get()** (25 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/GetProjectHandler.cs`
- **EventBasedProjectsProviderTests** (14 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Projects/EventBasedProjectsProviderTests.cs`
- **.CreateMockAsyncStreamingCall()** (11 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Projects/EventBasedProjectsProviderTests.cs`
- **MrsProviderTests** (10 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/MergeRequests/MrsProviderTests.cs`
- **CreateTaskHandlerTests** (9 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- **.ToAsyncEnumerable()** (8 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Projects/EventBasedProjectsProviderTests.cs`
- **FindEventsHandlerTests** (8 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/FindEventsHandlerTests.cs`
- **.GetResponses()** (8 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/FindEventsHandlerTests.cs`
- **.WriteAsync()** (8 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.CreateMockAsyncStreamingCall()** (8 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/MergeRequests/MrsProviderTests.cs`
- **.CreateDb()** (7 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- **.ToAsyncEnumerable()** (7 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- **GetProjectHandlerTests** (7 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/GetProjectHandlerTests.cs`
- **.Create()** (6 connections) — `OneMoreTaskTracker.Tasks/Tasks/Create/CreateTaskHandler.cs`
- **.Create_SavesTaskToDatabase()** (6 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- **.Create_StreamsInitialTaskResponse()** (6 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- **.Create_WhenMrsFound_DoesNotQueryProjects()** (6 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- **.Create_WhenMrsFound_StreamsSecondResponseWithMrsAndProjects()** (6 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- **.Create_WhenNoMrsAndNoProjects_StreamsOnlyInitialResponse()** (6 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- **.Create_WhenNoMrsButProjectsFound_StreamsProjectsResponse()** (6 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- **GetTaskHandlerTests** (5 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Get/GetTaskHandlerTests.cs`
- **.Get_FetchesProjectsForEachEvent_ByProjectId()** (4 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Projects/EventBasedProjectsProviderTests.cs`
- **.Get_FiltersOutNullEvents()** (4 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Projects/EventBasedProjectsProviderTests.cs`
- **.Get_PassesCorrectParameters_ToEventsFinder()** (4 connections) — `tests/OneMoreTaskTracker.Tasks.Tests/Projects/EventBasedProjectsProviderTests.cs`
- *... and 48 more nodes in this community*

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.GitLab.Proxy/Services/FindEventsHandler.cs`
- `OneMoreTaskTracker.GitLab.Proxy/Services/FindMrHandler.cs`
- `OneMoreTaskTracker.GitLab.Proxy/Services/GetProjectHandler.cs`
- `OneMoreTaskTracker.Tasks/Tasks/Create/CreateTaskHandler.cs`
- `OneMoreTaskTracker.Tasks/Tasks/Get/GetTaskHandler.cs`
- `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/FindEventsHandlerTests.cs`
- `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/GetProjectHandlerTests.cs`
- `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- `tests/OneMoreTaskTracker.Tasks.Tests/MergeRequests/MrsProviderTests.cs`
- `tests/OneMoreTaskTracker.Tasks.Tests/Projects/EventBasedProjectsProviderTests.cs`
- `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Create/CreateTaskHandlerTests.cs`
- `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Get/GetTaskHandlerTests.cs`

## Audit Trail

- EXTRACTED: 206 (59%)
- INFERRED: 145 (41%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*