---
id: onemoretracker-state-machine
trigger: "when implementing task state transitions in OneMoreTaskTracker.Tasks"
confidence: 0.9
domain: csharp
source: local-repo-analysis
---

# Encapsulate State Transitions With switch Expressions Inside Domain Class

## Action
State transitions belong inside the domain entity (`Task`), not in handlers or
services. Use a C# switch expression over a `(currentState, input)` tuple:

```csharp
public void AddMr(IMrInfo mr)
{
    State = (State, mr.TargetBranch) switch
    {
        (TaskState.NotStarted, "release") => TaskState.MrToRelease,
        (TaskState.NotStarted, "master")  => TaskState.MrToMaster,
        (TaskState.MrToMaster, "release") => TaskState.MrToRelease,
        _ => State
    };
    MergeRequests.Add(mr.Adapt<MergeRequest>());
}
```

The valid transitions are documented in `docs/CODEMAPS/data.md` — read it before
adding a new transition.

## Evidence
- Commit message explicitly states: "Encapsulate state transitions inside Task.AddMr
  / Task.AddProject using switch expressions aligned with the state machine in data.md"
- Task was changed from `record` to `class` specifically to support mutation methods
  while keeping value-semantic contract clear

## How to apply
When asked to add a new state transition (e.g. InTest → Completed), add it to the
switch expression in the Task entity, not in any handler. Update data.md diagram too.
