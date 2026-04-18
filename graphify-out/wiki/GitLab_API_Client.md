# GitLab API Client

> 31 nodes · cohesion 0.10

## Key Concepts

- **UserServiceHandlerTests** (20 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register()** (14 connections) — `OneMoreTaskTracker.Api/Controllers/AuthController.cs`
- **IGitLabApiClient** (6 connections) — `OneMoreTaskTracker.GitLab.Proxy/IGitLabApiClient.cs`
- **UserServiceHandler** (5 connections) — `OneMoreTaskTracker.Users/UserServiceHandler.cs`
- **.Authenticate()** (5 connections) — `OneMoreTaskTracker.Users/UserServiceHandler.cs`
- **.Register_BCryptsHashCorrectly_AndAuthenticateVerifiesRoundTrip()** (3 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **IDisposable** (2 connections)
- **.IsValidEmail()** (2 connections) — `OneMoreTaskTracker.Users/UserServiceHandler.cs`
- **.Register()** (2 connections) — `OneMoreTaskTracker.Users/UserServiceHandler.cs`
- **.Authenticate_WithCorrectCredentials_ReturnsSuccess()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Authenticate_WithNonExistentEmail_ReturnsFailure()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Authenticate_WithWrongPassword_ReturnsFailure()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WhenEmailAlreadyExists_ThrowsAlreadyExists()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WhenEmailIsEmpty_ThrowsInvalidArgument()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WhenEmailIsInvalid_ThrowsInvalidArgument()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WhenEmailIsTooLong_ThrowsInvalidArgument()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WhenEmailIsWhitespace_ThrowsInvalidArgument()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WhenManagerIdIsNonZeroButNotFound_ThrowsInvalidArgument()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WhenManagerIdRefersToNonManager_ThrowsInvalidArgument()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WhenPasswordIsEmpty_ThrowsInvalidArgument()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WhenPasswordTooShort_ThrowsInvalidArgument()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WithValidData_ReturnsUserWithDeveloperRole()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.Register_WithValidManagerId_Succeeds()** (2 connections) — `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`
- **.GetMany()** (1 connections) — `OneMoreTaskTracker.GitLab.Proxy/IGitLabApiClient.cs`
- **.GetOne()** (1 connections) — `OneMoreTaskTracker.GitLab.Proxy/IGitLabApiClient.cs`
- *... and 6 more nodes in this community*

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.Api/Controllers/AuthController.cs`
- `OneMoreTaskTracker.GitLab.Proxy/IGitLabApiClient.cs`
- `OneMoreTaskTracker.Users/UserServiceHandler.cs`
- `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`

## Audit Trail

- EXTRACTED: 62 (65%)
- INFERRED: 33 (35%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*