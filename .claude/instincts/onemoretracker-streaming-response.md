---
id: onemoretracker-streaming-response
trigger: "when designing a new gRPC operation that involves async enrichment or multi-phase results"
confidence: 0.85
domain: csharp-grpc
source: local-repo-analysis
---

# Use Server-Streaming for Multi-Phase Operations

## Action
When an operation produces an initial result quickly but enriches it asynchronously
(e.g. create entity → then look up related data from external APIs), use
`returns (stream ...)` instead of a single unary response.

Emit the initial state immediately so the caller is not blocked:

```proto
rpc Create(CreateTaskRequest) returns (stream CreateTaskResponse);
```

```csharp
// Emit immediately — don't wait for enrichment
await responseStream.WriteAsync(new CreateTaskResponse { Task = task.Adapt<TaskDto>() });

// Then enrich asynchronously
await foreach (var mr in mrsProvider.Find(..., ct))
    task.AddMr(mr);

// Emit enriched result
await responseStream.WriteAsync(enrichedResponse);
```

## Evidence
- CreateTaskHandler emits task twice: once immediately after DB save, once after MR lookup
- GitLab Proxy EventsService uses streaming for GitLab event pagination
- Pattern provides better UX — client sees progress rather than waiting

## How to apply
Prefer streaming when: (1) operation calls external API after initial DB write,
(2) result set is unbounded or paged, (3) caller benefits from incremental data.
