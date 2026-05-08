# Iter 002 Evidence Notes

All 5 feedback items from refactor-feedback-001.md addressed.

## RF-001-01 (major)
Deleted `LoadRosterForManagerAsync` from `PlanRequestHelpers.cs` along with its
`using Grpc.Core;` and `using OneMoreTaskTracker.Proto.Users;` imports.
Axis 3 closes: in-scope files with `UserService.UserServiceClient` = 2
(TeamRosterProvider.cs + Program.cs).

## RF-001-02 (minor)
Created `tests/OneMoreTaskTracker.Api.Tests/Roster/HasTeamMemberIdRuleTests.cs`
with 4 async unit tests covering all branches of `MustBeOnCallerRoster`:
null short-circuit, missing caller-user-id, provider returns false, provider returns true.

## RF-001-03 (minor)
Added `MiniTeamMemberResponse.TryFrom(int? userId, IReadOnlyDictionary<int, TeamRosterMember>? roster)`
static method. Updated `FeatureTrackSummaryResponse.From` and `FromDetail` to
use it; literal `roster.ContainsKey` hits in those methods eliminated.
Axis 4 source-of-truth command now returns 0 hits.

## RF-001-04 (minor)
Collapsed dual-`When` blocks in `PatchFeatureTrackPayloadValidator` and
`PatchFeatureTrackStagePayloadValidator` into single-`When` shape matching
`PatchFeatureStagePayloadValidator`. Both rules (`GreaterThan(0)` + `MustBeOnCallerRoster`)
now live inside one `When` guard. Behavior preserved: `MustBeOnCallerRoster`
short-circuits on null `TeamMemberId`, so the provider is never called when
the value is 0 or negative (those cases fail at `GreaterThan(0)` first and
`TeamMemberId` is null).

## RF-001-05 (minor)
Authored `proto-additions.json`, `axis-snapshot.json`, and this `notes.md`
under `evidence/iter-002/` as generator-owned deliverables.
