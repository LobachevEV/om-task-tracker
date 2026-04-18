# EventBasedProjectsProviderTests

> God node · 14 connections · `tests/OneMoreTaskTracker.Tasks.Tests/Projects/EventBasedProjectsProviderTests.cs`

## Connections by Relation

### contains
- [[EventBasedProjectsProviderTests.cs]] `EXTRACTED`

### method
- [[.CreateMockAsyncStreamingCall()]] `EXTRACTED`
- [[.ToAsyncEnumerable()]] `EXTRACTED`
- [[.Get_ReturnsProjects_ForEachPushEvent()]] `EXTRACTED`
- [[.Get_FiltersOutNullEvents()]] `EXTRACTED`
- [[.Get_ReturnsEmptySequence_WhenNoEventsFound()]] `EXTRACTED`
- [[.Get_PassesCorrectParameters_ToEventsFinder()]] `EXTRACTED`
- [[.Get_FetchesProjectsForEachEvent_ByProjectId()]] `EXTRACTED`
- [[.Get_ReturnsProjectsInEventOrder()]] `EXTRACTED`
- [[.Get_ThrowsRpcException_OnProjectGetterError()]] `EXTRACTED`
- [[.Get_ThrowsRpcException_OnEventStreamError()]] `EXTRACTED`
- [[.Get_PropagatesProjectGetterException()]] `EXTRACTED`
- [[.Get_SkipsNullProjectResults()]] `EXTRACTED`
- [[.Get_PropagatesRpcException_OnEventStreamError()]] `EXTRACTED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*