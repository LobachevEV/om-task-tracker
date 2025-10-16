---
id: onemoretracker-grpc-handler
trigger: "when adding a new gRPC operation to OneMoreTaskTracker.Tasks or OneMoreTaskTracker.Users"
confidence: 0.9
domain: csharp-grpc
source: local-repo-analysis
---

# One Handler Class Per Use-Case

## Action
Create a dedicated folder and handler class for each operation, not a catch-all
service class. Structure mirrors the operation name:

```
Tasks/{OperationName}/
├── {OperationName}Handler.cs   ← inherits generated gRPC base
└── (supporting types if needed)
```

Handler class name: `{OperationName}Handler`, base class: `{ServiceName}.{ServiceName}Base`.

Also create the proto file under `Protos/{OperationName}Command/` or
`Protos/{OperationName}Query/` depending on whether it mutates state.

## Evidence
- All 4 existing handlers follow this pattern: CreateTaskHandler, GetTaskHandler,
  ListTasksHandler + Gitlab.Proxy handler classes
- No God-class service files exist in the repository
- Co-change analysis: proto file + handler class always change together

## How to apply
When user asks to add a new gRPC endpoint (e.g. "add delete task"), create:
1. `Protos/DeleteTaskCommand/delete_task_command_handler.proto`
2. `Tasks/Delete/DeleteTaskHandler.cs`
3. Register handler in `Program.cs`
