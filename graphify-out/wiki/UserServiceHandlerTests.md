# UserServiceHandlerTests

> God node · 20 connections · `tests/OneMoreTaskTracker.Users.Tests/UserServiceHandlerTests.cs`

## Connections by Relation

### contains
- [[UserServiceHandlerTests.cs]] `EXTRACTED`

### inherits
- [[IDisposable]] `EXTRACTED`

### method
- [[.Register_BCryptsHashCorrectly_AndAuthenticateVerifiesRoundTrip()]] `EXTRACTED`
- [[.Register_WhenEmailIsEmpty_ThrowsInvalidArgument()]] `EXTRACTED`
- [[.Register_WhenPasswordIsEmpty_ThrowsInvalidArgument()]] `EXTRACTED`
- [[.Register_WhenEmailIsWhitespace_ThrowsInvalidArgument()]] `EXTRACTED`
- [[.Register_WhenEmailIsTooLong_ThrowsInvalidArgument()]] `EXTRACTED`
- [[.Register_WhenEmailIsInvalid_ThrowsInvalidArgument()]] `EXTRACTED`
- [[.Register_WhenPasswordTooShort_ThrowsInvalidArgument()]] `EXTRACTED`
- [[.Register_WhenEmailAlreadyExists_ThrowsAlreadyExists()]] `EXTRACTED`
- [[.Register_WhenManagerIdIsNonZeroButNotFound_ThrowsInvalidArgument()]] `EXTRACTED`
- [[.Register_WhenManagerIdRefersToNonManager_ThrowsInvalidArgument()]] `EXTRACTED`
- [[.Register_WithValidData_ReturnsUserWithDeveloperRole()]] `EXTRACTED`
- [[.Register_WithValidManagerId_Succeeds()]] `EXTRACTED`
- [[.Authenticate_WithCorrectCredentials_ReturnsSuccess()]] `EXTRACTED`
- [[.Authenticate_WithWrongPassword_ReturnsFailure()]] `EXTRACTED`
- [[.Authenticate_WithNonExistentEmail_ReturnsFailure()]] `EXTRACTED`
- [[.GetTeamMemberIds_ReturnsIdsOfMembersWithMatchingManagerId()]] `EXTRACTED`
- [[.GetTeamMemberIds_WhenNoMembers_ReturnsEmptyList()]] `EXTRACTED`
- [[.Dispose()]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*