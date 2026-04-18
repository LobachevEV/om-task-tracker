# Merge MR Service

> 18 nodes · cohesion 0.23

## Key Concepts

- **.Merge()** (14 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/MergeMrService.cs`
- **MergeMrServiceTests** (11 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.GetResponses()** (9 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **MergeMrService** (4 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/MergeMrService.cs`
- **.Merge_PreservesReferencesInSuccessfulMerge()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.Merge_WithEmptyStream_ProducesNoResponses()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.Merge_WithFailedPut_ReturnsMergeMrStatusFail()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.Merge_WithIdZero_ReturnsMergeMrStatusFail()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.Merge_WithMixedResultsAndFailures_ReturnsCorrectStatuses()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.Merge_WithMultipleRequests_ProcessesAllRequests()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.Merge_WithNullDto_ReturnsMergeMrStatusFail()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.Merge_WithSuccessfulPut_ReturnsMergeMrStatusSuccess()** (3 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.LogMrForProjectIdHasNotBeenMerged()** (2 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/MergeMrService.cs`
- **.LogMrForReferenceHasBeenMerged()** (2 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/MergeMrService.cs`
- **.Merge_BuildsCorrectUri()** (2 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **.Merge_WithDifferentProjectsAndMrs_BuildsCorrectUris()** (2 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`
- **MergeMrService.cs** (2 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/MergeMrService.cs`
- **MergeMrExtensions** (1 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/MergeMrService.cs`

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.GitLab.Proxy/Services/MergeMrService.cs`
- `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/MergeMrServiceTests.cs`

## Audit Trail

- EXTRACTED: 52 (71%)
- INFERRED: 21 (29%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*