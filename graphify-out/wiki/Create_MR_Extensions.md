# Create MR Extensions

> 13 nodes · cohesion 0.23

## Key Concepts

- **CreateMrExtensionTests** (6 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateMrExtensionTests.cs`
- **.ToPostContent()** (6 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateMrHandler.cs`
- **.Create()** (6 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateMrHandler.cs`
- **CreateMrHandler** (4 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateMrHandler.cs`
- **.ToPostContent_DefaultsRemoveSourceBranchAndSquashToTrue()** (2 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateMrExtensionTests.cs`
- **.ToPostContent_WithCustomFlags_RespectsFalseValues()** (2 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateMrExtensionTests.cs`
- **.ToPostContent_WithMasterTarget_UsesReleaseLabel()** (2 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateMrExtensionTests.cs`
- **.ToPostContent_WithNonMasterTarget_UsesDevelopLabel()** (2 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateMrExtensionTests.cs`
- **CreateMrExtension** (2 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateMrHandler.cs`
- **.LogMrForProjectNameHasBeenCreated()** (2 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateMrHandler.cs`
- **.LogMrForProjectNameHasNotBeenCreated()** (2 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateMrHandler.cs`
- **CreateMrHandler.cs** (2 connections) — `OneMoreTaskTracker.GitLab.Proxy/Services/CreateMrHandler.cs`
- **.Uri_HasCorrectProjectPath()** (1 connections) — `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateMrExtensionTests.cs`

## Relationships

- No strong cross-community connections detected

## Source Files

- `OneMoreTaskTracker.GitLab.Proxy/Services/CreateMrHandler.cs`
- `tests/OneMoreTaskTracker.GitLab.Proxy.Tests/Services/CreateMrExtensionTests.cs`

## Audit Trail

- EXTRACTED: 29 (74%)
- INFERRED: 10 (26%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*