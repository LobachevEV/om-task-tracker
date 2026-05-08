using System.Text.Json.Serialization;
using OneMoreTaskTracker.Api.Controllers.Plan;
using OneMoreTaskTracker.Api.Roster;

namespace OneMoreTaskTracker.Api.Controllers.Plan.Feature.Tracks;

public record PatchFeatureTrackPayload(
    [property: JsonConverter(typeof(TristateIntJsonConverter))] Tristate<int>? TrackOwnerUserId,
    int? ExpectedVersion) : IHasTeamMemberId
{
    public int? TeamMemberId
    {
        get
        {
            var (hasValue, protoValue) = PlanRequestHelpers.DecodeOwnerField(TrackOwnerUserId);
            return hasValue && protoValue > 0 ? protoValue : null;
        }
    }
}
