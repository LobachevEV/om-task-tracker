# Branch Creation Handler

> 31 nodes · cohesion 0.13

## Key Concepts

- **.Create()** (23 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateBranchHandler.cs`
- **.Post()** (15 connections) — `OneMoreTaskTracker.GitLab.Proxy/GitLabApiClient.cs`
- **CreateBranchHandlerTests** (9 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **GitLabApiClientTests** (8 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/GitLabApiClientTests.cs`
- **GitLabApiClient** (7 connections) — `OneMoreTaskTracker.GitLab.Proxy/GitLabApiClient.cs`
- **.CreateClient()** (7 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/GitLabApiClientTests.cs`
- **.GetResponses()** (6 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **.Create_WithEmptyStream_ProducesNoResponses()** (4 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **.Create_WithFailedPost_ReturnsFailStatus()** (4 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **.Create_WithMixedSuccessAndFailure_ReturnsCorrectStatuses()** (4 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **.Create_WithMultipleRequests_ProcessesAllRequests()** (4 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **.Create_WithSuccessfulPost_ReturnsSuccessStatus()** (4 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **CreateBranchHandler** (3 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateBranchHandler.cs`
- **.Create_BuildsCorrectUri()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **.Create_PassesCancellationToken()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **.Create_WithSpecialCharactersInBranchName_EncodesProperly()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`
- **.Post_WhenFailureStatus_ReturnsOkFalse()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/GitLabApiClientTests.cs`
- **.Post_WhenSuccessAndBodyContainsId_ReturnsOkTrue()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/GitLabApiClientTests.cs`
- **.Post_WhenSuccessButBodyLacksId_ReturnsOkFalse()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/GitLabApiClientTests.cs`
- **.Post_WithContent_SendsFormUrlEncodedContent()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/GitLabApiClientTests.cs`
- **.LogFailedToCreateABranchResponse()** (2 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateBranchHandler.cs`
- **.Put_WhenFailure_ReturnsErrorResult()** (2 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/GitLabApiClientTests.cs`
- **.Put_WhenSuccess_ReturnsSuccessResult()** (2 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/GitLabApiClientTests.cs`
- **CreateBranchHandler.cs** (2 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateBranchHandler.cs`
- **BranchesExtension** (1 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateBranchHandler.cs`
- *... and 6 more nodes in this community*

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.GitLab.Proxy/GitLabApiClient.cs`
- `OneMoreTaskTracker.GitLab.Proxy/Services/CreateBranchHandler.cs`
- `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/GitLabApiClientTests.cs`
- `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateBranchHandlerTests.cs`

## Audit Trail

- EXTRACTED: 79 (59%)
- INFERRED: 55 (41%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*