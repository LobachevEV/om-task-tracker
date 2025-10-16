---
id: onemoretracker-cancellation-token
trigger: "when writing async code in OneMoreTaskTracker C# services"
confidence: 0.95
domain: csharp
source: local-repo-analysis
---

# Always Propagate CancellationToken From ServerCallContext

## Action
Every async call inside a gRPC handler must receive `context.CancellationToken`.
Never fire-and-forget or use `CancellationToken.None` in handlers.

```csharp
// CORRECT
await dbContext.Tasks.AddAsync(task, context.CancellationToken);
await dbContext.SaveChangesAsync(context.CancellationToken);
await foreach (var item in provider.Find(id, context.CancellationToken))

// WRONG
await dbContext.Tasks.AddAsync(task);
await dbContext.SaveChangesAsync();
```

Interfaces that wrap external calls (IMrsProvider, IProjectsProvider) must accept
and thread `CancellationToken` as a parameter.

## Evidence
- Analyzed CreateTaskHandler, GetTaskHandler, ListTasksHandler — all pass CT
- IMrsProvider.Find signature includes CancellationToken
- Commit message explicitly calls out CT propagation as a design decision

## How to apply
Any time adding async code to a handler, IDE hint to add CT. If interface lacks CT
parameter, add it rather than passing CancellationToken.None.
