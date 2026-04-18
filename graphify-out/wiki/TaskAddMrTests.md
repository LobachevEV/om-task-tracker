# TaskAddMrTests

> God node · 11 connections · `tests/OneMoreTaskTracker.Tasks.Tests/Tasks/Data/TaskAddMrTests.cs`

## Connections by Relation

### contains
- [[TaskAddMrTests.cs]] `EXTRACTED`

### method
- [[.AddMr_WhenInDev_StateUnchanged()]] `EXTRACTED`
- [[.AddMr_WhenNotStartedAndTargetIsMaster_SetsStateMrToMaster()]] `EXTRACTED`
- [[.AddMr_WhenNotStartedAndTargetIsNotMaster_SetsStateMrToRelease()]] `EXTRACTED`
- [[.AddMr_WhenMrToMasterAndTargetIsNotMaster_SetsStateMrToRelease()]] `EXTRACTED`
- [[.AddMr_WhenMrToRelease_StateUnchanged()]] `EXTRACTED`
- [[.AddMr_WhenMrToMasterAndTargetIsMaster_StateUnchanged()]] `EXTRACTED`
- [[.AddMr_DuplicateIid_IsIgnored()]] `EXTRACTED`
- [[.AddMr_AddsGitRepo_WhenRepoNotPresent()]] `EXTRACTED`
- [[.AddMr_DoesNotDuplicateGitRepo_WhenSameProjectId()]] `EXTRACTED`
- [[.AddMr_StoresMrFields_Correctly()]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*