using System.Text.Json.Serialization;
using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Api.Roster;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record PatchFeatureTrackStagePayload(
    [property: JsonConverter(typeof(TristateIntJsonConverter))] Tristate<int>? StageOwnerUserId,
    string? PlannedStart,
    string? PlannedEnd,
    int? ExpectedStageVersion) : IHasTeamMemberId
{
    public int? TeamMemberId
    {
        get
        {
            var (hasValue, protoValue) = PlanRequestHelpers.DecodeOwnerField(StageOwnerUserId);
            return hasValue && protoValue > 0 ? protoValue : null;
        }
    }
}
